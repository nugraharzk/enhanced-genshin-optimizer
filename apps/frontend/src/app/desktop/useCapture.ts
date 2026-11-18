import { useCallback, useEffect, useRef, useState } from 'react'
import { getInvoke } from '../tauri'

// Subscribers for each GOOD dump the capture poll produces. Module-level so
// the poll survives renders — consumers (Home dashboard) register once.
const capturedCbs = new Set<(good: string) => void>()

export function onCaptured(cb: (good: string) => void): () => void {
  capturedCbs.add(cb)
  return () => {
    capturedCbs.delete(cb)
  }
}

/**
 * Drives the elevated capture worker: arms it (launching via UAC if not
 * alive), then polls `take_capture` every 5 s, handing GOOD dumps to
 * `onCaptured` subscribers. `auto` is the user toggle persisted for the
 * injected script's convention (`nb_autocapture`, absent/anything ≠ '0' = on).
 */
export function useCapture() {
  const invoke = getInvoke()
  const [running, setRunning] = useState(false)
  const [auto, setAutoState] = useState(
    () => localStorage.getItem('nb_autocapture') !== '0'
  )
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const setAuto = useCallback((v: boolean) => {
    localStorage.setItem('nb_autocapture', v ? '1' : '0')
    setAutoState(v)
  }, [])

  const stopWatching = useCallback(() => {
    if (timer.current !== null) {
      clearInterval(timer.current)
      timer.current = null
      setRunning(false)
    }
  }, [])

  const arm = useCallback(async () => {
    const inv = getInvoke()
    if (!inv || timer.current !== null) return
    const alive = await inv('capture_running')
    if (!mountedRef.current) return
    if (!alive) await inv('launch_capture')
    if (!mountedRef.current) return
    timer.current = setInterval(async () => {
      const inv = getInvoke()
      if (!inv) return
      try {
        const good = (await inv('take_capture')) as string | null
        if (good) for (const cb of capturedCbs) cb(good)
      } catch {
        // Worker died mid-session — stop the poll instead of throwing
        // unhandled rejections every tick while the UI says "running".
        stopWatching()
      }
    }, 5000)
    setRunning(true)
  }, [stopWatching])

  // On unmount, stop the poll only (the worker keeps running by design —
  // stopWatching() is the explicit user action for that).
  useEffect(() => {
    return () => {
      if (timer.current !== null) {
        clearInterval(timer.current)
        timer.current = null
      }
    }
  }, [])

  return { running, auto, setAuto, arm, stopWatching }
}

// All localStorage keys → one object; the backup is a full-state snapshot.
export function dumpStorage(): Record<string, string> {
  const dump: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k !== null) dump[k] = localStorage.getItem(k) ?? ''
  }
  return dump
}

/**
 * Once per mount per day: if a shared database exists, push a full
 * localStorage snapshot to the worker's backup dir before anything else
 * can clobber it. `__lastAutoBackup` (UTC date) prevents repeat backups.
 */
export function useAutoBackup() {
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    if (!localStorage.getItem('dbIndex')) return
    if (localStorage.getItem('__lastAutoBackup') === today) return
    const inv = getInvoke()
    if (!inv) return
    inv('save_backup', { json: JSON.stringify(dumpStorage()) })
      .then(() => localStorage.setItem('__lastAutoBackup', today))
      .catch(() => {
        // No stamp on failure — retry next mount.
      })
  }, [])
}
