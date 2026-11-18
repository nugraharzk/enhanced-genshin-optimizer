/**
 * A failed dynamic import means this tab is holding a module graph the server
 * can't satisfy any more:
 *
 *  - `build.sh` swapped `dist/` under an open tab, so the old hashed chunk is
 *    gone (404), or
 *  - the local `server.mjs` process died, so every request fails (net error).
 *
 * Both land in GO's ErrorBoundary as
 * `TypeError: error loading dynamically imported module: …`.
 *
 * Neither is a data problem: reloading gets a fresh `index.html` and fresh
 * chunk names. This module reloads once automatically, and if the origin is
 * unreachable it says so plainly instead of showing a stack trace.
 */
const RELOAD_GUARD_KEY = 'go-chunk-reload-at'
const RELOAD_GUARD_MS = 15_000

let recovering = false

const CHUNK_ERROR_RE =
  /dynamically imported module|Importing a module script failed/i

export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return CHUNK_ERROR_RE.test(msg)
}

/** Wrap a page `import()` so a chunk failure recovers instead of crashing. */
export function recoverableImport<T>(load: () => Promise<T>): Promise<T> {
  return load().catch((err) => {
    void recoverFromChunkError()
    // Never reject: the route keeps its Suspense fallback while we recover.
    return new Promise<T>(() => {})
  })
}

/** Vite fires this when a modulepreload hint or CSS chunk fails to load. */
export function installChunkRecovery(): void {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault()
    void recoverFromChunkError()
  })
}

export async function recoverFromChunkError(): Promise<void> {
  if (recovering) return
  recovering = true

  const reachable = await originReachable()
  if (!reachable) {
    showOverlay('offline')
    return
  }

  const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0)
  if (Date.now() - last < RELOAD_GUARD_MS) {
    // A reload just happened and the chunk still failed: rebuilding while the
    // reload ran, or a broken build. Ask instead of looping.
    showOverlay('stale')
    return
  }
  sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()))
  location.reload()
}

async function originReachable(): Promise<boolean> {
  try {
    const res = await fetch(location.href, {
      method: 'HEAD',
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
    return res.ok
  } catch {
    return false
  }
}

const OVERLAYS = {
  offline: {
    title: 'Local server is not running',
    body: 'This app is served by <code>server.mjs</code> on your own machine. Start it again — double-click <code>Start Genshin Optimizer Web.bat</code> in <code>D:\\Playground\\genshin-optimizer-web</code> — then reload.',
    action: 'Reload',
  },
  stale: {
    title: 'This tab is running an older build',
    body: 'The files changed while this tab was open. Reload to pick up the new build.',
    action: 'Reload',
  },
} as const

function showOverlay(kind: keyof typeof OVERLAYS) {
  if (document.getElementById('go-recovery')) return
  const { title, body, action } = OVERLAYS[kind]
  const el = document.createElement('div')
  el.id = 'go-recovery'
  el.setAttribute('role', 'alert')
  el.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:2147483647',
    'display:flex', 'align-items:center', 'justify-content:center',
    'padding:24px', 'background:var(--go-bg,#0a0a0f)',
    'color:var(--go-text,#ececf3)', 'font-family:Inter,system-ui,sans-serif',
  ].join(';')
  el.innerHTML = `
    <div style="max-width:34rem;padding:24px;border:1px solid var(--go-border-strong,#3a3a4d);border-radius:var(--go-radius,12px);background:var(--go-surface,#14141c)">
      <h1 style="margin:0 0 8px;font-size:1.125rem;font-weight:600">${title}</h1>
      <p style="margin:0 0 16px;line-height:1.55;color:var(--go-text-dim,#9c9cb0);font-size:0.875rem">${body}</p>
      <button type="button" style="cursor:pointer;border:0;border-radius:calc(var(--go-radius,12px) - 4px);background:var(--go-accent,#7c6cff);color:var(--go-accent-text,#0a0a0f);padding:8px 16px;font:inherit;font-weight:600">${action}</button>
    </div>`
  el.querySelector('button')?.addEventListener('click', () => location.reload())
  document.body.appendChild(el)
}
