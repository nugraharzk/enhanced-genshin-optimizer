import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoBackup, useCapture } from './useCapture'

type Invoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>

// This environment's jsdom build exposes no `localStorage`; the app code
// reads it as a global, so give it a minimal map-backed stand-in.
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>()
  const shim: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => [...store.keys()][i] ?? null,
    removeItem: (k: string) => void store.delete(k),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
  }
  ;(globalThis as any).localStorage = shim
}

function mockTauri(invoke: Invoke) {
  ;(window as any).__TAURI__ = { core: { invoke } }
}

function getInvokeMock(): Invoke {
  return (window as any).__TAURI__.core.invoke
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
  delete (window as any).__TAURI__
})

describe('useCapture', () => {
  it('setAuto writes nb_autocapture 0/off and back on', () => {
    mockTauri(vi.fn())
    const { result } = renderHook(() => useCapture())
    expect(result.current.auto).toBe(true)
    act(() => result.current.setAuto(false))
    expect(localStorage.getItem('nb_autocapture')).toBe('0')
    expect(result.current.auto).toBe(false)
    act(() => result.current.setAuto(true))
    expect(localStorage.getItem('nb_autocapture')).not.toBe('0')
    expect(result.current.auto).toBe(true)
  })

  it('arm() does not launch when capture is already running', async () => {
    const invoke = vi.fn(async (cmd: string) =>
      cmd === 'capture_running' ? true : null
    )
    mockTauri(invoke)
    const { result } = renderHook(() => useCapture())
    await act(() => result.current.arm())
    expect(invoke).not.toHaveBeenCalledWith('launch_capture')
    act(() => result.current.stopWatching())
  })

  it('arm() launches once when not running, then polls take_capture', async () => {
    vi.useFakeTimers()
    let running = false
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'capture_running') return running
      if (cmd === 'launch_capture') {
        running = true
        return null
      }
      if (cmd === 'take_capture') return running ? '{"GOOD":[]}' : null
      return null
    })
    mockTauri(invoke)
    const { result } = renderHook(() => useCapture())
    await act(() => result.current.arm())
    expect(invoke).toHaveBeenCalledWith('launch_capture')
    expect(
      invoke.mock.calls.filter((c) => c[0] === 'launch_capture').length
    ).toBe(1)

    // second arm while running: no second launch
    await act(() => result.current.arm())
    expect(
      invoke.mock.calls.filter((c) => c[0] === 'launch_capture').length
    ).toBe(1)

    // poll ticks take_capture every 5 s
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(invoke).toHaveBeenCalledWith('take_capture')
    const calls = invoke.mock.calls.filter((c) => c[0] === 'take_capture')
    expect(calls.length).toBe(1)
    result.current.stopWatching()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(
      invoke.mock.calls.filter((c) => c[0] === 'take_capture').length
    ).toBe(1)
  })
})

describe('useAutoBackup', () => {
  it('skips save_backup when dbIndex is absent', () => {
    const invoke = vi.fn(async () => '/back/ups/x.json')
    mockTauri(invoke)
    renderHook(() => useAutoBackup())
    expect(invoke).not.toHaveBeenCalled()
  })

  it('invokes save_backup once and stamps __lastAutoBackup when dbIndex set', async () => {
    vi.useFakeTimers()
    const invoke = vi.fn(async () => '/back/ups/x.json')
    mockTauri(invoke)
    localStorage.setItem('dbIndex', '{"some":"db"}')
    const { unmount } = renderHook(() => useAutoBackup())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith('save_backup', {
      json: JSON.stringify({ dbIndex: '{"some":"db"}' }),
    })
    expect(localStorage.getItem('__lastAutoBackup')).toBe(
      new Date().toISOString().slice(0, 10)
    )
    // remount same day: no second invoke
    unmount()
    renderHook(() => useAutoBackup())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(invoke).toHaveBeenCalledTimes(1)
  })
})
