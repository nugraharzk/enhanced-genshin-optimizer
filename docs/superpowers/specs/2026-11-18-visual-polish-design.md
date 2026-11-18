# Visual Polish Pass (Phase 2) — short design

Date: 2026-11-18
Status: approved (A+B; C deferred to phase 3)

## Intent

Make the whole app *feel* polished, not just the new surfaces: real font,
token-based elevation, subtle motion, consistent typography. One small,
low-risk pass.

## Goals (A: foundation, B: apply to new surfaces)

A. Foundation:
   - Bundle Inter variable woff2 self-hosted (~48 KB, `assets/fonts/`), loaded
     via `@font-face` in `apps/frontend/src/tailwind.css`; desktop CSP allows
     font-src 'self' data:. Text stops silently falling back to Roboto.
   - Shadow tokens: `--go-shadow-sm/md/lg` published in `applyThemeVars`
     (derived from mode: soft dark shadows on dark themes, hairline+soft on
     light), Tailwind utilities `shadow-go-sm/md/lg` via `@theme`.
   - Motion: small keyframes (fade + slide 4px) applied on Radix
     `data-[state=open]/closed`; ~120-160ms ease-out. A tiny `@keyframes` set
     in tailwind.css + utility classes; applied to menus/popovers/toasts.
   - Typography conventions as utilities: `text-title` (page/card titles),
     `text-label` (uppercase 11px tracking-wide dim), plus `tabular-nums`
     usage on all numeric badges/counts.
   - MUI gets the font + elevation for free via `Theme.tsx` component defaults
     (MuiPaper/MuiCard/MuiDialog boxShadow from the new shadow tokens).

B. Apply to new surfaces only (shell: Sidebar, AppShell header/sheet,
   CommandPalette, DesktopPanel, Toaster, Home dashboard, Footer,
   SharedBadge, ThemeSwitcher): swap scattered `shadow-2xl shadow-black/40`
   for shadow-go-*, add entrance animations, apply text-title/text-label/
   tabular conventions.

## Non-goals

- No redesign of MUI screens (phase 3/4); only their font/shadow change via
  MUI defaults.
- No new themes, no token renames, no layout changes.

## Approach

Direct token-layer extension (A) + mechanical surface pass (B). Rejected:
CSS-in-JS overrides per component (fragmented, MUI-coupled) and skip-the-font
(Inter without the file is the single biggest gap).

## Acceptance

- Built app shows Inter (check DevTools computed font on body).
- Theme cycle still repaints everything; shadows visibly differ dark vs light.
- Menus/toasts have subtle entrance animation; no layout shift.
- Full test suite unchanged except intentionally updated specs.
