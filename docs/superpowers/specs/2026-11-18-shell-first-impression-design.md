# Shell & First Impression Revamp — short design

Date: 2026-11-18
Status: approved (conversation with user)

## Intent & why

The desktop app's first screen is the upstream MUI home page, half-hollowed
out by a `MutationObserver` that hides useless-for-offline cards every 1.2 s
(Patch Notes, Meet the Team, Quick Links, ads…). The backup/capture panel is a
raw-DOM floating widget injected from `app-index.html` — emoji buttons,
hand-rolled styles, a restore picker whose hover turns text black. Both are
the parts the user sees first and neither matches the token design system
(12 themes, Radix + Tailwind) the shell already uses.

## Goals

- Replace the upstream home page with a real React dashboard: live inventory
  stats (artifacts/weapons/characters/teams), quick actions (Optimizer,
  Capture, Backup), capture status card (Auto ON/OFF, waiting/armed/imported).
- Move backup/capture UI into the SPA as a Radix popover/panel next to
  SharedBadge/ThemeSwitcher in the sidebar footer, token-styled, lucide icons,
  consistent toasts. Rust commands (`save_backup`, `list_backups`,
  `read_backup`, `backup_folder`, `launch_capture`, `take_capture`,
  `capture_running`) are unchanged.
- Delete the injected panel + the home-page `hideJunk`/`hideVideos`
  DOM-hacking from `app-index.html`; keep the CSP meta, ad-killer, and the
  debug hooks (`window.__nb`).
- Toolchain: build the frontend with **bun** (1.4.4, `C:\Users\iki\.bun\bin\bun.exe`)
  instead of yarn — repo uses `nodeLinker: node-modules` so this is safe.
  Cargo/Tauri side untouched.

## Non-goals / anti-goals

- No rewriting the ~300 MUI screens (that is later phases 2–4).
- No changes to capture logic, GOOD import, shared-db sync, or Rust code
  beyond what removing the injection requires (none expected).
- No new theme tokens.

## Approach chosen

Dashboard + in-SPA panel, built as real components on the existing token
stack (Radix popover + Tailwind utilities mapped to `--go-*` vars). Rejected
alternatives: (a) keep upstream home and patch its cards — keeps the
setInterval hacks and never looks native; (b) keep the injected panel but
restyled — inline DOM styles can't follow the theme cleanly and duplicate
state the SPA already has (nav counts, capture status).

## Left to the builder

- Exact dashboard layout/spacing; reuse `useNavCounts` for stats.
- Where Auto-capture toggle state lives (keep `nb_autocapture` localStorage
  key for compatibility).
- Home route swaps in `apps/frontend/src/app/App.tsx` (new local PageHome
  component or override of `@genshin-optimizer/gi/page-home`).

## Suggested next phases (user asked for a recommendation)

1. ~~Shell & first impression~~ (this doc)
2. Visual polish pass: typography scale, spacing, elevation, empty/loading
   states across token layer (small–medium).
3. UX redesign of the heavy workflow screens (Optimizer, Artifacts) one at a
   time (large, per screen).
4. Incremental migration of remaining MUI screens to Radix/Tailwind.
