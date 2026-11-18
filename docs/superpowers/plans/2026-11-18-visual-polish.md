# Visual Polish Pass (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real font (self-hosted Inter), token-based elevation, subtle Radix motion, and typography conventions — foundation plus a mechanical pass over the new Radix/Tailwind surfaces.

**Architecture:** Extend the token layer (`tailwind.css` + `tokens.ts` + `Theme.tsx`) so every surface inherits, then sweep the shell components for the new utilities. No layout changes, no theme changes, no MUI screen rewrites.

**Tech Stack:** Tailwind v4 (`@theme`/`@layer`), CSS variables on `<html>` (existing `applyThemeVars`), MUI component defaults in `Theme.tsx`, bun build.

**Spec:** `docs/superpowers/specs/2026-11-18-visual-polish-design.md`

## Global Constraints

- All colours via existing `--go-*` tokens; shadow tokens are rgba-black alphas (they are shadows, not surfaces).
- No new npm deps. No MUI in new CSS beyond `Theme.tsx` component defaults.
- Motion: 120–160 ms ease-out, 4 px max travel, entrance only (`data-[state=open]`); respect `@media (prefers-reduced-motion: reduce)` (disable animations).
- Font: InterVariable.woff2 self-hosted under `apps/frontend/public/fonts/` (or `src/assets` — pick what the existing build serves; `public/` maps to root), one `@font-face` with `font-weight: 100 900; font-display: swap;` and unicode-range default. CSS font stack stays `Inter, Roboto, ...`.
- Desktop CSP already allows `font-src 'self' data:` — do not loosen it.
- bun: `& "C:\Users\iki\.bun\bin\bun.exe" nx build frontend` from `D:/Playground/go-src-probe`; tests via `& "C:\Users\iki\.bun\bin\bun.exe" x vitest run <files>` from `apps/frontend` (vitest globals + jsdom).
- Known pre-existing failure: `app.spec.tsx` (jsdom localStorage) — ignore.

## Review Focus

1. **CSP holds** — the font must load in the desktop app without a CSP error; the @font-face src is a same-origin path. Verify: built index/dist contains the font asset path, `font-src` untouched.
2. **No preflight/layout shift** — adding @font-face and utilities must not reset MUI screens (tailwind.css still imports only theme+utilities, no preflight). Verify: build succeeds; full suite passes.
3. **Reduced motion** — animations fully disabled under `prefers-reduced-motion: reduce`. Verify: grep the final CSS for the media query wrapping the animation classes.
4. **Theme repaint** — shadow tokens are per-mode (dark vs light differ); switching themes swaps them. Verify: grep dist CSS for both shadow token values; manual theme cycle in smoke test.
5. **Tests honest** — the only JS-observable change is MUI defaults; specs that assert styling stay green without weakening assertions.

---

### Task 1: Foundation — font, shadow tokens, motion, typography utilities

**Files:**
- Create: font file `apps/frontend/public/fonts/InterVariable.woff2` (download: `https://rsms.me/inter/font-files/InterVariable.woff2`; verify size ~300–900 KB and it starts with `wOF2`; if the URL fails, fetch from `https://github.com/rsms/inter/releases` latest `Inter-4.1.zip` → `extras/ttf`→ use webfont `InterVariable.woff2` inside `web/` folder)
- Modify: `apps/frontend/src/tailwind.css` (add: `@font-face`; shadow tokens via `@theme inline { --shadow-go-sm/md/lg: var(--go-shadow-sm/md/lg) }` plus the actual `--go-shadow-*` values defined per mode using existing `html[data-go-mode]` selector or a `[data-go-mode='light']` override block in a `@layer base`; `@keyframes go-in` (opacity 0→1, translateY 4px→0) and utility classes `animate-go-in` / `data-[state=open]:animate-go-in` pattern; typography utilities `.text-title` (15px/600/-0.01em) and `.text-label` (11px/600 uppercase tracking-[0.14em] text-fg-dim); `prefers-reduced-motion` block killing `animate-go-in`)
- Modify: `libs/gi/theme/src/tokens.ts` — `applyThemeVars` publishes `--go-shadow-sm/md/lg`; per-mode values: dark `sm: 0 1px 2px rgba(0,0,0,.4)`, `md: 0 8px 24px rgba(0,0,0,.45)`, `lg: 0 18px 40px rgba(0,0,0,.5)`; light `sm: 0 1px 2px rgba(15,23,42,.08)`, `md: 0 8px 24px rgba(15,23,42,.10)`, `lg: 0 18px 40px rgba(15,23,42,.14)`
- Modify: `libs/gi/theme/src/Theme.tsx` — MuiPaper/MuiCard/MuiDialog/MuiMenu styleOverrides use `var(--go-shadow-sm)` (paper/card) and `var(--go-shadow-md)` (dialog/menu)

**Interfaces:**
- Produces: CSS vars `--go-shadow-sm|md|lg`; utilities `shadow-go-sm/md/lg`, `animate-go-in`, `text-title`, `text-label`; font family unchanged (`Inter` now actually available).

- [ ] **Step 1: Download the font** into `apps/frontend/public/fonts/InterVariable.woff2`; verify first bytes are `wOF2`.
- [ ] **Step 2: Implement the CSS/token changes** (no unit test applies — CSS is verified by build + smoke).
- [ ] **Step 3: Build** — `bun nx build frontend`; verify dist CSS contains `@font-face`, `--go-shadow-md`, `animate-go-in`, the `prefers-reduced-motion` block, and the font file copied into `dist/apps/frontend/fonts/`.
- [ ] **Step 4: Run full suite** — only the known `app.spec.tsx` failure may appear.
- [ ] **Step 5: Commit** — `feat(theme): self-hosted Inter, shadow tokens, motion + typography utilities`.

### Task 2: Apply to the new surfaces

**Files:**
- Modify: `apps/frontend/src/app/Sidebar.tsx`, `AppShell.tsx` (header + mobile sheet), `CommandPalette.tsx`, `Footer.tsx`, `SharedBadge.tsx`, `ThemeSwitcher.tsx`, `desktop/DesktopPanel.tsx`, `desktop/toast.tsx`, `Home/index.tsx`, `Home/StatCard.tsx`, `Home/CaptureCard.tsx`

**Interfaces:**
- Consumes: Task 1 utilities (`shadow-go-*`, `animate-go-in`, `text-title`, `text-label`) and shadow vars.

- [ ] **Step 1: Mechanical sweep.** In each file: replace `shadow-2xl shadow-black/40` → `shadow-go-lg`; popovers/menus/dialogs get `data-[state=open]:animate-go-in`; Toaster items get `animate-go-in`; page/card headings use `text-title`; sidebar group labels + similar uppercase micro-labels use `text-label`; all numeric badges/counts add `tabular-nums` (most already have it — don't double-apply); keep every existing token class otherwise. Do not restructure markup.
- [ ] **Step 2: Build + full suite** (same commands as Task 1). Expected: green except the known failure.
- [ ] **Step 3: Grep the new files** — no `shadow-black` or `shadow-2xl` remains in `src/app/`; commit — `style(shell): apply shadow/motion/typography conventions to new surfaces`.

### Task 3: Desktop build + smoke test handoff

**Files:** none (build only).

- [ ] **Step 1:** `bun nx build frontend` (if not already from Task 2), then from `genshin-optimizer-desktop/src-tauri`: `& "C:\Program Files\Git\bin\bash.exe" tools/sync_dist.sh` (falls back to `compose_index.mjs` when python absent — expected on this machine).
- [ ] **Step 2:** Verify `dist/index.html` composed (CSP + `__nb`) and `dist/fonts/InterVariable.woff2` exists.
- [ ] **Step 3:** `cargo build --release --target-dir target-ds` (PATH: `D:/Playground/tools/mingw64/bin` + `C:\Users\iki/.cargo/bin`). Commit nothing (desktop repo not git).
- [ ] **Step 4:** Hand off smoke test to the human: Inter renders (DevTools computed font), theme cycle repaints shadows, menus/toast animate, reduced-motion toggle disables animation, no console CSP errors.
