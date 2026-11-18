import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
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

// ---------------------------------------------------------------------------
// Module-level singleton poller state.
//
// useCapture() is mounted in more than one place (DesktopPanel and Home's
// CaptureCard). Keeping the timer per-component let two 5 s `take_capture`
// pollers race, and let an unmount (navigating off Home) kill the only poll.
// So the timer, `running` and `auto` live here at module scope: exactly one
// poller app-wide, and component unmounts never touch it. Only an explicit
// stop (user "Stop waiting", or a rejected poll tick) ends the poll.
// ---------------------------------------------------------------------------

interface CaptureStore {
  running: boolean
  auto: boolean
}

// Lazy init: reading localStorage at import time would break environments
// (tests) that install a localStorage shim after module evaluation.
let store: CaptureStore | null = null
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setInterval> | null = null

function ensureStore(): CaptureStore {
  if (!store)
    store = {
      running: false,
      auto: localStorage.getItem('nb_autocapture') !== '0',
    }
  return store
}

function emit() {
  for (const l of listeners) l()
}

export function subscribeCapture(cb: () => void): () => void {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getCaptureStore(): CaptureStore {
  return ensureStore()
}

function stopWatching() {
  if (timer === null) return
  clearInterval(timer)
  timer = null
  store = { ...ensureStore(), running: false }
  emit()
}

let arming = false

async function arm() {
  const inv = getInvoke()
  if (!inv || timer !== null || arming) return
  arming = true
  try {
    const alive = await inv('capture_running')
    if (timer !== null) return // another arm won the race
    if (!alive) await inv('launch_capture')
    timer = setInterval(async () => {
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
    store = { ...ensureStore(), running: true }
    emit()
  } finally {
    arming = false
  }
}

/**
 * Drives the elevated capture worker: arms it (launching via UAC if not
 * alive), then polls `take_capture` every 5 s, handing GOOD dumps to
 * `onCaptured` subscribers. `auto` is the user toggle persisted for the
 * injected script's convention (`nb_autocapture`, absent/anything ≠ '0' = on).
 *
 * All state is a module-level singleton (see above), so every caller of this
 * hook shares one poller and one view of it.
 */
export function useCapture() {
  const snap = useSyncExternalStore(subscribeCapture, getCaptureStore)

  const setAuto = useCallback((v: boolean) => {
    localStorage.setItem('nb_autocapture', v ? '1' : '0')
    store = { ...ensureStore(), auto: v }
    emit()
  }, [])

  return { running: snap.running, auto: snap.auto, setAuto, arm, stopWatching }
}

/** Test/teardown: the explicit stop, same action as the UI's "Stop waiting". */
export function stopCapturePoll() {
  stopWatching()
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
