# Shell & First Impression Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the upstream home page with a token-themed dashboard and move the injected backup/capture panel into the SPA, so the app's first screen is honest, fast, and on the design system.

**Architecture:** Two new component groups in `apps/frontend/src/app`: a `Home/` dashboard (stats + quick actions + capture status) and a `DesktopPanel` popover in the sidebar footer. A small `tauri.ts` bridge wraps `window.__TAURI__.core.invoke` (null in the web build → panel hidden). `app-index.html` keeps only CSP + ad-killer + `__nb` debug hooks; the panel DOM and home-page card-hiding hacks are deleted. Rust commands untouched.

**Tech Stack:** React + Radix DropdownMenu/Switch + Tailwind utilities mapped to `--go-*` tokens (existing `tailwind.css`), lucide icons, Tauri 2 (`withGlobalTauri`), bun for builds.

**Spec:** `docs/superpowers/specs/2026-11-18-shell-first-impression-design.md`

## Global Constraints

- All colours/radii via tokens: `bg-surface`, `bg-surface2`, `border-line`, `border-line-strong`, `text-fg`, `text-fg-dim`, `text-accent`, `bg-accent`, `text-accent-fg`, `rounded-go`, `bg-accent/12` — no hardcoded colours (exception: toasts' error red `#e5484d` may use Tailwind `bg-red-500` as SharedBadge's dot does).
- No MUI in new components. No new npm deps (`@radix-ui/react-dropdown-menu` and `@radix-ui/react-switch` are already in `package.json`).
- `bun` lives at `C:\Users\iki\.bun\bin\bun.exe` (a stale nvm shim shadows `bun` on PATH — always use the full path).
- Keep `nb_autocapture` localStorage key ('1'/'0') and `__lastAutoBackup` (YYYY-MM-DD) for backward compatibility.
- Web build (`genshin-optimizer-web`) must keep working: every Tauri call is guarded by the bridge returning null.
- New UI copy is hardcoded English/Indonesian like the existing `SharedBadge`/Sidebar ("Jump to…") — do not add i18n keys.
- Build: `& "C:\Users\iki\.bun\bin\bun.exe" nx build frontend` from `D:\Playground\go-src-probe` (~15 s → `dist/apps/frontend`).

## Review Focus

1. **Web build must not crash without Tauri** — `tauri.ts` returns null when `window.__TAURI__` is absent; panel and capture card render nothing / hide themselves. Test: Task 1's test with a `window` lacking `__TAURI__`.
2. **Capture worker already running** — arming must call `capture_running` first and never stack a second elevated worker; the auto-arm on launch must fire once per session. Test: Task 2's test asserts the guard.
3. **Restore is never a one-way door** — before overwriting localStorage, a safety `save_backup` of the current state must succeed and its filename must surface in the toast. Test: Task 3's test on the restore flow mock.
4. **Auto-backup fires once per day, only when a db exists** — guarded by `__lastAutoBackup` + `dbIndex`. Test: Task 2's test.
5. **Theme repaint** — every new component uses only token utilities; switching any of the 12 themes must restyle them. Manual check step in Task 5 (open app, cycle Dark/Light themes).

---

### Task 0: Commit the existing shell work as baseline

The repo has 23 modified + untracked files from the previous session (sidebar, palette, themes) that this work builds on. Nothing new is implemented.

**Files:** none created.

- [ ] **Step 1: Review and commit**

```bash
cd D:/Playground/go-src-probe
git add apps/frontend libs/gi/theme package.json yarn.lock .yarnrc.yml .gitignore
git commit -m "feat: token design system + Radix/Tailwind shell (sidebar, palette, 12 themes)"
```

(Yarn cache zips stay untracked on purpose unless `.gitignore` says otherwise.)

### Task 1: Tauri bridge

**Files:**
- Create: `apps/frontend/src/app/tauri.ts`
- Test: `apps/frontend/src/app/tauri.spec.ts`

**Interfaces:**
- Produces: `getInvoke(): TauriInvoke | null` where `type TauriInvoke = (cmd: string, args?: Record<string, unknown>) => Promise<unknown>`; `isDesktop(): boolean` (true iff `getInvoke()` is non-null).

- [ ] **Step 1: Write the failing test**

```ts
// tauri.spec.ts
import { getInvoke, isDesktop } from './tauri'

describe('tauri bridge', () => {
  it('returns null invoke and false isDesktop in a plain browser', () => {
    ;(window as any).__TAURI__ = undefined
    expect(getInvoke()).toBeNull()
    expect(isDesktop()).toBe(false)
  })
  it('exposes invoke when __TAURI__ is present', () => {
    const fake = vi.fn()
    ;(window as any).__TAURI__ = { core: { invoke: fake } }
    expect(getInvoke()).toBe(fake)
    expect(isDesktop()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd D:/Playground/go-src-probe; & "C:\Users\iki\.bun\bin\bun.exe" nx test frontend`
Expected: FAIL — module `./tauri` not found. (If the `test` target is not configured on `frontend`, fall back to `bunx vitest run apps/frontend/src/app/tauri.spec.ts` with the repo's existing vitest config; the plan's later verification relies on the build, not the runner.)

- [ ] **Step 3: Implement `getInvoke` / `isDesktop`**

Poll-free lazy read of `(window as any).__TAURI__?.core?.invoke`; return `null` otherwise. No timers, no retries — components that need to wait mount after `__TAURI__` exists (script is injected before the SPA boots).

- [ ] **Step 4: Run test to verify it passes**

Same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/app/tauri.ts apps/frontend/src/app/tauri.spec.ts
git commit -m "feat: tauri bridge for desktop-only UI"
```

### Task 2: Capture + backup hooks

**Files:**
- Create: `apps/frontend/src/app/desktop/useCapture.ts`
- Create: `apps/frontend/src/app/desktop/useAutoBackup.ts`
- Test: `apps/frontend/src/app/desktop/useCapture.spec.ts`

**Interfaces:**
- Consumes: `getInvoke` (Task 1).
- Produces:
  - `useCapture()` → `{ running: boolean, auto: boolean, setAuto(v: boolean): void, arm(): Promise<void>, stopWatching(): void }`. `auto` reads/writes `localStorage['nb_autocapture']`. `arm()` calls `capture_running`; if not alive, `launch_capture`; then starts a 5 s `take_capture` poll that on data returns it to the caller via a module-level `onCaptured(cb)` subscription (exported: `onCaptured(cb: (good: string) => void): () => void` — the GOOD import from app-index already exists; see Task 5 for who consumes it).
  - `useAutoBackup()` → runs once per mount: if `localStorage['dbIndex']` is set and `localStorage['__lastAutoBackup'] !== today (YYYY-MM-DD UTC)`, invoke `save_backup` with `JSON.stringify(dumpStorage())` and set `__lastAutoBackup`. `dumpStorage()` is a small exported helper in this file (all localStorage keys → object).

- [ ] **Step 1: Write the failing test** — with a fake invoke:
  - `setAuto(false)` writes `nb_autocapture='0'` and back.
  - `arm()` when `capture_running` resolves `true` does **not** call `launch_capture`.
  - `arm()` when `capture_running` resolves `false` calls `launch_capture` exactly once and starts polling `take_capture`; a second `arm()` while running does not call `launch_capture` again.
  - `useAutoBackup` skips when no `dbIndex`; invokes once and stamps `__lastAutoBackup` when set; does not invoke again on second mount the same day.
- [ ] **Step 2: Run test to verify it fails** — same runner as Task 1. Expected: FAIL (module missing).
- [ ] **Step 3: Implement the hooks.** `useCapture` holds a `setInterval(5000)` ref; auto-arm-on-launch lives in the `Home`/sidebar consumer (Task 4) guarded by `sessionStorage['nb_autocapture_done']` (same key the injected script used). Use `vi.useFakeTimers` for the poll test.
- [ ] **Step 4: Run test to verify it passes.**
- [ ] **Step 5: Commit** — `feat: capture + auto-backup hooks for desktop panel`.

### Task 3: Toast + DesktopPanel

**Files:**
- Create: `apps/frontend/src/app/desktop/toast.tsx` — `toast(text: string, bad?: boolean): void` (dispatches a window event) + `<Toaster/>` (fixed bottom-right, token-styled, 4 s lifetime, `bg-red-500` for bad).
- Create: `apps/frontend/src/app/desktop/DesktopPanel.tsx`
- Modify: `apps/frontend/src/app/Sidebar.tsx` (footer: `<DesktopPanel/>` above `<SharedBadge/>`), `apps/frontend/src/app/AppShell.tsx` (render `<Toaster/>` once)
- Test: `apps/frontend/src/app/desktop/DesktopPanel.spec.tsx`

**Interfaces:**
- Consumes: `getInvoke` (Task 1), `useCapture` (Task 2), Rust commands unchanged: `save_backup({json})` → path string, `list_backups()` → string[], `read_backup({name})` → json string, `backup_folder()` → path.
- Produces: `DesktopPanel` — a Radix DropdownMenu triggered by an icon button (lucide `HardDriveDownload`, not emoji); content: "Backup to disk", "Restore…" (a second Radix DropdownMenu.Sub listing the 8 newest `go-<ms>.json`, labels = locale datetime), "Open folder", separator, Auto-capture row with Radix `Switch`, "Capture now"/"Stop waiting" row. Restore flow: `read_backup` → safety `save_backup` of current `dumpStorage()` → clear + refill localStorage → toast with the safety filename → reload after 1 s. If `getInvoke()` is null, render nothing.

- [ ] **Step 1: Write the failing test** — mock Task 1/2 modules and the invoke:
  - panel renders nothing when `getInvoke` returns null;
  - "Backup to disk" calls `save_backup` and toasts the path;
  - restore on a listed backup calls `save_backup` (safety) **before** mutating `localStorage`, then reloads (spy on `location.reload`).
- [ ] **Step 2: Run test to verify it fails.**
- [ ] **Step 3: Implement `toast.tsx` + `DesktopPanel`.** Styles copy the ThemeSwitcher vocabulary (`rounded-go border-line bg-surface2`, `data-[highlighted]:bg-surface2`, `z-[2200]`). No 8-second auto-close timer (Radix handles outside-click).
- [ ] **Step 4: Run test to verify it passes.**
- [ ] **Step 5: Commit** — `feat: in-app backup/capture panel replaces injected DOM widget`.

### Task 4: Home dashboard

**Files:**
- Create: `apps/frontend/src/app/Home/index.tsx` (+ `Home/StatCard.tsx`, `Home/CaptureCard.tsx`)
- Modify: `apps/frontend/src/app/App.tsx` — replace the `PageHome` lazy import of `@genshin-optimizer/gi/page-home` with the local `Home` page (keep the other routes untouched)
- Test: `apps/frontend/src/app/Home/index.spec.tsx`

**Interfaces:**
- Consumes: `NAV_GROUPS`/`useNavCounts` (`./nav`), `useCapture`/`onCaptured` (Task 2), `getInvoke` (Task 1).
- Produces: default-exported `HomePage`:
  - Header row: page title + subtitle ("Everything runs local — optimizer, database, backups").
  - Stats row: 4 cards (Artifacts/Weapons/Characters/Teams) from `useNavCounts`, numbers tabular-nums, each card links to its route.
  - Quick actions row: buttons linking to Artifacts, Teams, Tools; a Backup button that calls `save_backup` and toasts; a Capture button delegating to `useCapture.arm()`/`stopWatching()` (desktop only — hidden in web build).
  - Capture status card (desktop only): Auto ON/OFF switch (`nb_autocapture`), state line — idle / "armed — waiting for Genshin login" / "importing…" — plus the counts once `onCaptured` fires (then reload like the panel does). Auto-arm on launch here (guarded by `sessionStorage['nb_autocapture_done']`).

- [ ] **Step 1: Write the failing test** — mock `./nav` counts to `{arts: 5, weapons: 2, chars: 3, teams: 1}`: four stat links render with those numbers and `href="#/artifacts"` etc.; with `getInvoke` null, no capture card and no capture button render.
- [ ] **Step 2: Run test to verify it fails.**
- [ ] **Step 3: Implement the dashboard.** Layout with Tailwind grid (`grid gap-3 sm:grid-cols-2 lg:grid-cols-4`); card style `rounded-go border border-line bg-surface p-4`. No MUI `Skeleton` fallback needed (it's a synchronous local page).
- [ ] **Step 4: Run test to verify it passes.**
- [ ] **Step 5: Commit** — `feat: local home dashboard replaces upstream page-home`.

### Task 5: app-index.html cleanup + desktop build

**Files:**
- Modify: `D:/Playground/genshin-optimizer-desktop/src-tauri/app-index.html`

- [ ] **Step 1: Delete from the second `<script>`** the panel UI (`mount`'s DOM building, `toggle`, `restoreList`, buttons, toast CSS) — keep `dumpStorage`, `importGood`, `startCaptureWatch`, `armCapture`, the launch auto-arm, and `window.__nb = { importGood, startCaptureWatch }`. Keep the toast only as the plain function those hooks use. Then delete the entire first script's `hideVideos` and `hideJunk` blocks (home page no longer renders those cards; the ad-killer style + `kill()` + Lootbar/img rules stay).
- [ ] **Step 2: Build the frontend with bun**

```bash
cd D:/Playground/go-src-probe
& "C:\Users\iki\.bun\bin\bun.exe" nx build frontend
```

Expected: `dist/apps/frontend/index.html` written, no type errors.

- [ ] **Step 3: Sync + compose + Rust build**

```bash
cd D:/Playground/genshin-optimizer-desktop/src-tauri
bash tools/sync_dist.sh            # atomic swap + locales en/id + compose_index.py
cargo build --release              # D:/Playground/tools/mingw64/bin on PATH
```

Expected: `dist/index.html` contains the CSP meta and the slimmed scripts; `cargo build` succeeds (if `os error 32`, a capture worker holds the exe — rebuild with `--target-dir target-ds` and copy over, per README).

- [ ] **Step 4: Manual smoke test** — launch `src-tauri\target\release\genshin-optimizer-desktop.exe`: dashboard shows with live counts; sidebar footer shows the new panel (Backup → toast with path; Restore lists files; Auto toggle persists across restart); Ctrl+K palette still opens; cycle three themes (one dark, one light) and confirm every new surface repaints.
- [ ] **Step 5: Commit** (desktop repo) — `chore: slim app-index injections, UI moved into SPA`.
