import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DesktopPanel from './DesktopPanel'
import { Toaster } from './toast'

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>

// This environment's jsdom build exposes no `localStorage`; the app code
// reads it as a global, so give it a minimal map-backed stand-in (same
// shim pattern as useCapture.spec.ts), instrumented so the restore test
// can assert ordering between invoke calls and storage mutation.
const mutations: string[] = []
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>()
  const shim: Storage = {
    get length() {
      return store.size
    },
    clear: () => {
      mutations.push('clear')
      store.clear()
    },
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => [...store.keys()][i] ?? null,
    removeItem: (k: string) => void store.delete(k),
    setItem: (k: string, v: string) => {
      mutations.push(`set:${k}`)
      store.set(k, String(v))
    },
  }
  ;(globalThis as any).localStorage = shim
} else {
  const origSet = localStorage.setItem.bind(localStorage)
  localStorage.setItem = (k: string, v: string) => {
    mutations.push(`set:${k}`)
    return origSet(k, v)
  }
}

function mockTauri(invoke: Invoke) {
  ;(window as any).__TAURI__ = { core: { invoke } }
}

// jsdom has no PointerEvent, so drive Radix with keyboard events instead:
// Enter opens the root menu, ArrowRight opens the Restore… sub-menu.
function openMenu() {
  const trigger = screen.getByRole('button', { name: 'Desktop backups' })
  fireEvent.keyDown(trigger, { key: 'Enter' })
}

function clickItem(name: string | RegExp) {
  const item = screen.getByText(name)
  fireEvent.click(item.closest('[role^="menuitem"]') ?? item)
}

const reload = vi.fn()
beforeEach(() => {
  localStorage.clear()
  mutations.length = 0
  vi.stubGlobal('location', { ...window.location, reload })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  delete (window as any).__TAURI__
})

describe('DesktopPanel', () => {
  it('renders nothing when getInvoke() is null (plain browser)', () => {
    const { container } = render(<DesktopPanel />)
    expect(container.innerHTML).toBe('')
  })

  it('"Backup to disk" calls save_backup and toasts the path', async () => {
    const invoke = vi.fn(async (cmd: string) =>
      cmd === 'save_backup' ? '/backups/go-123.json' : null
    )
    mockTauri(invoke)
    localStorage.setItem('dbIndex', '{"some":"db"}')
    render(
      <>
        <DesktopPanel />
        <Toaster />
      </>
    )
    openMenu()
    clickItem('Backup to disk')
    await act(async () => {})
    expect(invoke).toHaveBeenCalledWith('save_backup', {
      json: JSON.stringify({ dbIndex: '{"some":"db"}' }),
    })
    expect(await screen.findByText('/backups/go-123.json')).toBeTruthy()
  })

  it('restore: safety save_backup before localStorage mutation, then reload', async () => {
    vi.useFakeTimers()
    // Invoke calls and storage mutations share one ordered log so the
    // safety-snapshot-before-mutation ordering is directly assertable.
    mutations.push('START')
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd !== 'capture_running') mutations.push(cmd)
      if (cmd === 'list_backups')
        return ['go-1000.json', 'go-2000.json', 'go-3000.json']
      if (cmd === 'read_backup') return '{"foo":"bar"}'
      if (cmd === 'save_backup') return '/backups/go-9999.json'
      return null
    })
    mockTauri(invoke)
    localStorage.setItem('existing', 'state')
    render(
      <>
        <DesktopPanel />
        <Toaster />
      </>
    )
    openMenu()
    // open the Restore… sub-menu (Radix SubTrigger opens on click), then
    // pick the newest backup
    fireEvent.click(screen.getByText('Restore…'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    fireEvent.click(screen.getByText(new Date(3000).toLocaleString()))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    // everything after the setup marker, in order
    const log = mutations.slice(mutations.indexOf('START') + 1)
    expect(log).toContain('read_backup')
    expect(log.indexOf('read_backup')).toBeLessThan(
      log.indexOf('save_backup')
    )
    expect(log.indexOf('save_backup')).toBeLessThan(log.indexOf('clear'))
    expect(log.slice(log.indexOf('clear'))).toEqual(['clear', 'set:foo'])
    // safety snapshot is a full dump of current storage
    expect(invoke).toHaveBeenCalledWith('save_backup', {
      json: JSON.stringify({ existing: 'state' }),
    })
    // storage refilled from the picked backup
    expect(localStorage.getItem('foo')).toBe('bar')
    expect(localStorage.getItem('existing')).toBeNull()
    // toast shows the safety filename, then the SPA reloads after 1 s
    expect(document.body.textContent).toContain('/backups/go-9999.json')
    expect(reload).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(reload).toHaveBeenCalledTimes(1)
  })
})
