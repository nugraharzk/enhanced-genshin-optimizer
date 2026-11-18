/**
 * One database, two apps.
 *
 * GO keeps its inventory in localStorage — not as one blob, but as one key per
 * entity (`artifact_*`, `weapon_*`, `char_*`, `team_*`, `optConfig_*`, …), plus
 * `db_ver` / `dbIndex` / `dbMeta` and periodically an `extraDatabase_N` export
 * snapshot. `extraDatabase_N` alone is NOT the live database.
 *
 * This module mirrors every key GO persists to one file on disk —
 * `%APPDATA%\dev.local.genshin-optimizer\shared\go-db.json` — so the web build
 * (via `server.mjs`) and the Tauri build (via its Rust commands) read and write
 * the same database.
 *
 * UI state stays local on purpose: theme, language, table filters and the
 * new-tab ping must not bounce between the two apps.
 *
 * Conflict policy: writes carry the revision they were based on. If the other
 * app wrote in between, the hub answers with a conflict; this client stops
 * writing and offers a reload. It never silently clobbers newer data.
 */

/** Never shared: pure UI/client state. Everything else is a database key. */
const LOCAL_ONLY_RE =
  /^(?:display_.*|i18nextLng|go-design-theme|GONewTabDetection|silly|snow|__.*)$/

const META_KEY = '__goShared'
const WRITER_KEY = '__goSharedWriter'
const FLUSH_DEBOUNCE_MS = 800
const RETRY_MS = 5000

type Snapshot = {
  revision: number
  updatedAt: number
  writer: string | null
  keys: Record<string, string>
}

type WriteRequest = {
  baseRevision: number
  writer: string
  keys: Record<string, string>
  deleted: string[]
}

type WriteResult =
  | { ok: true; revision: number }
  | { ok: false; conflict: number }
  | { ok: false; offline: true }

export type SharedStatus = {
  mode: 'local' | 'shared' | 'offline' | 'conflict'
  at?: number
}

interface Backend {
  label: string
  read(): Promise<Snapshot | null>
  write(req: WriteRequest): Promise<WriteResult>
  snapshot(keys: Record<string, string>): Promise<void>
}

// ---------------------------------------------------------------------------
// state + subscriptions
// ---------------------------------------------------------------------------

let backend: Backend | null = null
let status: SharedStatus = { mode: 'local' }
let meta: { revision: number } | null = null
let writer = ''
const dirty = new Set<string>()
const removed = new Set<string>()
let flushing = false
let flushTimer: ReturnType<typeof setTimeout> | undefined
let retryTimer: ReturnType<typeof setTimeout> | undefined
let hooksInstalled = false
let hydrating = false

const listeners = new Set<() => void>()

function setStatus(next: SharedStatus) {
  status = next
  for (const l of listeners) l()
}

export function getSharedStatus(): SharedStatus {
  return status
}

export function subscribeSharedStatus(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// ---------------------------------------------------------------------------
// backends
// ---------------------------------------------------------------------------

function detectBackend(): Backend | null {
  const invoke = (window as any).__TAURI__?.core?.invoke
  if (typeof invoke === 'function') return tauriBackend(invoke)
  // The web build is always served by server.mjs, so /api/shared exists.
  if (location.protocol.startsWith('http')) return httpBackend()
  return null
}

function httpBackend(): Backend {
  return {
    label: 'web',
    async read() {
      const res = await fetch('/api/shared', { cache: 'no-store' })
      if (!res.ok) throw new Error(`hub ${res.status}`)
      return (await res.json()) as Snapshot
    },
    async write(req) {
      try {
        const res = await fetch('/api/shared', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(req),
        })
        if (res.status === 409) {
          const body = (await res.json()) as { revision: number }
          return { ok: false, conflict: body.revision }
        }
        if (!res.ok) return { ok: false, offline: true }
        const body = (await res.json()) as { revision: number }
        return { ok: true, revision: body.revision }
      } catch {
        return { ok: false, offline: true }
      }
    },
    async snapshot(keys) {
      await fetch('/api/shared/snapshot', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ writer: writer || 'web', keys }),
      })
    },
  }
}

function tauriBackend(
  invoke: (cmd: string, args?: unknown) => Promise<unknown>
): Backend {
  return {
    label: 'desktop',
    async read() {
      const raw = (await invoke('shared_read')) as string | null
      return raw ? (JSON.parse(raw) as Snapshot) : null
    },
    async write(req) {
      try {
        const revision = (await invoke('shared_write', {
          payload: JSON.stringify(req),
        })) as number
        return { ok: true, revision }
      } catch (err) {
        const conflict = /^conflict:(\d+)$/.exec(String(err))
        if (conflict) return { ok: false, conflict: Number(conflict[1]) }
        return { ok: false, offline: true }
      }
    },
    async snapshot(keys) {
      await invoke('shared_snapshot', {
        payload: JSON.stringify({ writer: writer || 'desktop', keys }),
      })
    },
  }
}

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------

export async function initSharedStore(): Promise<void> {
  const local = collectLocal()
  backend = detectBackend()
  if (!backend) {
    setStatus({ mode: 'local' })
    return
  }
  writer = readWriterId()
  meta = readMeta()

  let remote: Snapshot | null = null
  try {
    remote = await backend.read()
  } catch {
    setStatus({ mode: 'offline' })
    installHooks()
    scheduleRetry()
    return
  }

  const remoteKeys = remote?.keys ?? {}
  const remoteRevision = remote?.revision ?? 0
  const remoteWeight = weight(remoteKeys)
  const localWeight = weight(local)

  if (!remoteWeight && localWeight) {
    // Fresh hub: seed it with what this client already has.
    queueAll(local, {})
  } else if (remoteWeight && !localWeight) {
    hydrate(remoteKeys, remoteRevision)
  } else if (remoteWeight && localWeight) {
    if (meta && meta.revision === remoteRevision) {
      // already in sync
    } else if (meta && meta.revision < remoteRevision) {
      // the other app wrote since our last sync: adopt it
      hydrate(remoteKeys, remoteRevision)
    } else if (meta) {
      // our last write never reached the hub (rolled back): push ours, based on
      // the hub's current revision — writing our old, higher revision would
      // never match
      meta = { revision: remoteRevision }
      writeMeta(meta)
      queueAll(local, remoteKeys)
    } else if (localWeight > remoteWeight) {
      // Two independent databases meet for the first time. Keep a copy of the
      // one that loses, then the bigger one wins — an empty-ish hub must not
      // swallow a real inventory.
      await backend.snapshot(remoteKeys).catch(() => {})
      meta = { revision: remoteRevision }
      writeMeta(meta)
      queueAll(local, remoteKeys)
    } else {
      await backend.snapshot(local).catch(() => {})
      hydrate(remoteKeys, remoteRevision)
    }
  }

  installHooks()
  if (dirty.size || removed.size) {
    scheduleFlush()
  } else {
    // Nothing to merge: adopt whatever revision the hub is at. A `sendBeacon`
    // flush on the previous unload bumps the hub without this client ever
    // seeing the response, so a stale revision here would turn the next write
    // into a false conflict.
    meta = { revision: remoteRevision }
    writeMeta(meta)
    setStatus({ mode: 'shared', at: remote?.updatedAt || Date.now() })
  }
}

export function syncNow(): void {
  if (status.mode === 'conflict') {
    location.reload()
    return
  }
  if (!dirty.size && !removed.size) queueAll(collectLocal(), {})
  void flush()
}

// ---------------------------------------------------------------------------
// localStorage mirroring
// ---------------------------------------------------------------------------

function isSharedKey(key: string): boolean {
  return !LOCAL_ONLY_RE.test(key)
}

function collectLocal(): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key || !isSharedKey(key)) continue
    const value = localStorage.getItem(key)
    if (value !== null) out[key] = value
  }
  return out
}

/** Rough size of a key set, used only to decide which side wins a first merge. */
function weight(keys: Record<string, string>): number {
  let total = 0
  for (const value of Object.values(keys)) total += value.length
  return total
}

function queueAll(
  local: Record<string, string>,
  remote: Record<string, string>
) {
  for (const key of Object.keys(local)) dirty.add(key)
  for (const key of Object.keys(remote))
    if (!(key in local)) removed.add(key)
}

function hydrate(keys: Record<string, string>, revision: number) {
  hydrating = true
  try {
    const present = new Set(Object.keys(keys))
    for (const key of Object.keys(collectLocal()))
      if (!present.has(key)) localStorage.removeItem(key)
    for (const [key, value] of Object.entries(keys))
      if (localStorage.getItem(key) !== value) localStorage.setItem(key, value)
    // Adopt the hub's revision, otherwise the first write looks like it came
    // from revision 0 and the hub answers 409.
    meta = { revision }
    writeMeta(meta)
  } finally {
    hydrating = false
  }
}

function installHooks() {
  if (hooksInstalled) return
  hooksInstalled = true
  const proto = Storage.prototype
  const setItem = proto.setItem
  const removeItem = proto.removeItem
  const clear = proto.clear

  proto.setItem = function (key: string, value: string) {
    setItem.call(this, key, value)
    if (this === localStorage && !hydrating && isSharedKey(key)) {
      dirty.add(key)
      removed.delete(key)
      scheduleFlush()
    }
  }
  proto.removeItem = function (key: string) {
    removeItem.call(this, key)
    if (this === localStorage && !hydrating && isSharedKey(key)) {
      dirty.delete(key)
      removed.add(key)
      scheduleFlush()
    }
  }
  proto.clear = function () {
    if (this === localStorage && !hydrating) {
      for (const key of Object.keys(collectLocal())) {
        dirty.delete(key)
        removed.add(key)
      }
    }
    clear.call(this)
    if (this === localStorage && !hydrating) scheduleFlush()
  }

  window.addEventListener('beforeunload', () => {
    if (!dirty.size && !removed.size) return
    const payload = buildPayload()
    if (!payload) return
    // sendBeacon survives the unload; invoke() does not, so the desktop can
    // lose the very last keystroke and catches up on the next boot.
    if (backend?.label === 'web') {
      navigator.sendBeacon(
        '/api/shared/beacon',
        new Blob([JSON.stringify(payload)], { type: 'text/plain' })
      )
    }
  })
}

function buildPayload(baseRevision = meta?.revision ?? 0): WriteRequest | null {
  if (!backend) return null
  const keys: Record<string, string> = {}
  const deleted = new Set(removed)
  for (const key of dirty) {
    const value = localStorage.getItem(key)
    if (value === null) deleted.add(key)
    else keys[key] = value
  }
  if (!Object.keys(keys).length && !deleted.size) return null
  return {
    baseRevision,
    writer,
    keys,
    deleted: [...deleted],
  }
}

function scheduleFlush() {
  clearTimeout(flushTimer)
  flushTimer = setTimeout(() => void flush(), FLUSH_DEBOUNCE_MS)
}

function scheduleRetry() {
  clearTimeout(retryTimer)
  retryTimer = setTimeout(() => void flush(), RETRY_MS)
}

async function flush() {
  if (!backend || flushing || hydrating) return
  if (status.mode === 'conflict') return
  const payload = buildPayload()
  if (!payload) {
    setStatus({ mode: 'shared', at: status.at })
    return
  }

  const pendingKeys = new Set(dirty)
  const pendingRemoved = new Set(removed)
  flushing = true
  const res = await backend.write(payload)
  flushing = false

  if (res.ok) {
    for (const key of pendingKeys) dirty.delete(key)
    for (const key of pendingRemoved) removed.delete(key)
    meta = { revision: res.revision }
    writeMeta(meta)
    setStatus({ mode: 'shared', at: Date.now() })
    if (dirty.size || removed.size) scheduleFlush()
    return
  }
  if ('conflict' in res) {
    setStatus({ mode: 'conflict' })
    return
  }
  setStatus({ mode: 'offline' })
  scheduleRetry()
}

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

function readMeta(): { revision: number } | null {
  try {
    const raw = localStorage.getItem(META_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { revision?: number }
    return typeof parsed.revision === 'number'
      ? { revision: parsed.revision }
      : null
  } catch {
    return null
  }
}

/** Bookkeeping write that must not trigger our own mirror hook. */
function writeLocalSilently(key: string, value: string) {
  const setItem = Storage.prototype.setItem
  hydrating = true
  try {
    setItem.call(localStorage, key, value)
  } finally {
    hydrating = false
  }
}

function writeMeta(value: { revision: number }) {
  writeLocalSilently(META_KEY, JSON.stringify(value))
}

function readWriterId(): string {
  const name = backend?.label ?? 'client'
  try {
    const existing = localStorage.getItem(WRITER_KEY)
    if (existing?.startsWith(`${name}:`)) return existing
    const id = `${name}:${Math.random().toString(36).slice(2, 10)}`
    writeLocalSilently(WRITER_KEY, id)
    return id
  } catch {
    return `${name}:anon`
  }
}
