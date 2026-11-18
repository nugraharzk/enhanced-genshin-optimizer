import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stopCapturePoll, useAutoBackup, useCapture, onCaptured } from './useCapture'

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
  // The poller is a module-level singleton; make sure no test leaks a live
  // timer into the next one.
  act(() => {
    stopCapturePoll()
  })
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
    act(() => result.current.stopWatching())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(
      invoke.mock.calls.filter((c) => c[0] === 'take_capture').length
    ).toBe(1)
  })

  it('stops the poll and flips running when take_capture rejects', async () => {
    vi.useFakeTimers()
    const onUnhandled = vi.fn()
    process.on('unhandledRejection', onUnhandled)
    let fail = false
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'capture_running') return true
      if (cmd === 'take_capture') {
        if (fail) throw new Error('worker died')
        return null
      }
      return null
    })
    mockTauri(invoke)
    const { result } = renderHook(() => useCapture())
    await act(() => result.current.arm())
    expect(result.current.running).toBe(true)

    fail = true
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    // poll stopped, running flipped false
    expect(result.current.running).toBe(false)
    const ticks = invoke.mock.calls.filter((c) => c[0] === 'take_capture')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(
      invoke.mock.calls.filter((c) => c[0] === 'take_capture').length
    ).toBe(ticks.length)
    // no unhandled rejection escaped from the interval callback
    expect(onUnhandled).not.toHaveBeenCalled()
    process.off('unhandledRejection', onUnhandled)
  })

  it('two useCapture() callers share one singleton poller', async () => {
    vi.useFakeTimers()
    const captured: string[] = []
    const subs = [onCaptured((g) => captured.push('a:' + g)), onCaptured((g) => captured.push('b:' + g))]
    let running = false
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'capture_running') return running
      if (cmd === 'launch_capture') {
        running = true
        return null
      }
      if (cmd === 'take_capture') return running ? '{"GOOD":[1]}' : null
      return null
    })
    mockTauri(invoke)

    const a = renderHook(() => useCapture())
    const b = renderHook(() => useCapture())

    // arm in one → running true in the other
    await act(() => a.result.current.arm())
    expect(a.result.current.running).toBe(true)
    expect(b.result.current.running).toBe(true)

    // arm again in the other: still exactly one launch, one poller
    await act(() => b.result.current.arm())
    expect(
      invoke.mock.calls.filter((c) => c[0] === 'launch_capture').length
    ).toBe(1)

    // one tick → exactly one take_capture, both subscribers see the dump
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(invoke.mock.calls.filter((c) => c[0] === 'take_capture').length).toBe(1)
    expect(captured).toEqual(['a:{"GOOD":[1]}', 'b:{"GOOD":[1]}'])

    // stop in one → running false in the other too
    act(() => a.result.current.stopWatching())
    expect(b.result.current.running).toBe(false)
    for (const unsub of subs) unsub()
  })

  it('unmount does not stop the singleton poll', async () => {
    vi.useFakeTimers()
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'capture_running') return true
      if (cmd === 'take_capture') return '{"GOOD":[]}'
      return null
    })
    mockTauri(invoke)
    const { result, unmount } = renderHook(() => useCapture())
    await act(() => result.current.arm())
    expect(result.current.running).toBe(true)
    unmount()

    // A fresh mount (e.g. navigating back to Home) still sees the poll running.
    const again = renderHook(() => useCapture())
    expect(again.result.current.running).toBe(true)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000)
    })
    expect(
      invoke.mock.calls.filter((c) => c[0] === 'take_capture').length
    ).toBe(2)
    again.unmount()
  })

  it('arm() completing after unmount still starts the poll (singleton outlives components)', async () => {
    vi.useFakeTimers()
    const invoke = vi.fn(async (cmd: string) => {
      if (cmd === 'capture_running') return false
      if (cmd === 'launch_capture') return null
      if (cmd === 'take_capture') return '{"GOOD":[]}'
      return null
    })
    mockTauri(invoke)
    const { result, unmount } = renderHook(() => useCapture())
    const arming = act(() => result.current.arm())
    unmount()
    await arming
    // The module-level poller is armed regardless of the component's fate.
    expect(invoke).toHaveBeenCalledWith('launch_capture')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(invoke).toHaveBeenCalledWith('take_capture')
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
