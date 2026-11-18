// Bridge to the Tauri desktop shell. `withGlobalTauri` injects
// `window.__TAURI__` before the SPA boots, so a lazy read is enough —
// in a plain browser (web build) it is simply absent.
export type TauriInvoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>

export function getInvoke(): TauriInvoke | null {
  return (window as any).__TAURI__?.core?.invoke ?? null
}

export function isDesktop(): boolean {
  return getInvoke() !== null
}
