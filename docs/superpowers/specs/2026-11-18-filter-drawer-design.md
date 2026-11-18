# Filter Drawer Revamp — design

Date: 2026-11-18
Status: approved approach C (hybrid: new drawer shell/layout, existing MUI filter
controls reused inside; small controls restyled where cheap)

## Intent

Filters on Artifacts / Weapons / Characters render inline above the grid as big
MUI cards and apply live on every click. The user wants them out of the page
flow — a right-side drawer — with a readable section order, plus explicit
**Apply** and **Reset** (draft semantics: nothing changes until Apply).

## Goals

- One shared `FilterDrawer` (Radix Dialog, token-styled) used by all three pages.
- Filters never render in the page body; the page shows only a slim toolbar:
  `Showing x/y` + `Sort` + a **Filters** button carrying an active-filter count.
- Drawer content is grouped into ordered sections with sticky header
  (title + active count + Reset) and sticky footer (Reset ghost, Apply primary).
- Draft semantics: every control edits local draft state; **Apply** commits to
  the DB display state and closes; **Reset** clears the draft to defaults
  (does not commit until Apply); Escape/backdrop discards the draft.
- Section order fixed per page (below). "Apply" lives in the footer only.

## Non-goals

- No rewrite of filter *logic* (substat counting, autocomplete option lists,
  sort options) — reused as-is.
- No changes to bulk action buttons (unequip/delete/lock/unlock) beyond moving
  them next to the toolbar where they already sit.
- Search field on Characters moves into the drawer but stays local state.

## Decisions (from builder check)

- **Live exceptions (decided):** the Characters/Weapons **search** field and the
  artifact **effective-substats toggle (`effFilter`)** stay live — they are
  find/view affordances, not saved filters. Everything that is part of the
  DB filter state is draft + Apply. This is the one documented exception.
- **Reset scope:** filter keys only. Never write `sortType`, `ascending`, or
  `editWeaponId`. Characters have no `{action:'reset'}` — Reset is always
  draft-local; only Apply commits.
- **Apply merge:** write only the filter keys of the draft (spread over the
  committed value), never a blanket display-state write.
- **Active count:** toolbar badge = committed state; drawer header = draft;
  each changed key counts 1 (arrays count 1 regardless of length).
- **Reset button** appears in the footer only (header keeps title + count).
- **Artifact defaults** derive from the exported `initialFilterOption()` —
  no hand-copied default object.
- **WeaponFilterBody** takes `filteredIds` explicitly (totals need it).
- **Tailwind `@source` paths** (relative to `apps/frontend/src/tailwind.css`):
  `../../../libs/gi/ui/src`, `../../../libs/gi/page-artifacts/src`,
  `../../../libs/gi/page-weapons/src`, `../../../libs/gi/page-characters/src`.
- **Drawer z-scale:** overlay `z-[3000]`, content `z-[3001]`, no `md:hidden`
  (desktop-only shell surface, but it must also work in the web build).

## Section order (decided)

Artifacts: **Sets** → **Main stat** → **Substats** → **Slot** → **Rarity &
level** (rarity, level slider, substat lines) → **Inventory** (locked,
inventory/equipped toggles, location) → **Roll value** (RV slider, effective
substats).
Weapons: **Type** → **Rarity** → **Inventory** (locked, inventory/equipped,
location).
Characters: **Type** → **Element** → **Rarity** → **Search**.

## Architecture

- `libs/gi/ui/src/components/filters/FilterDrawer.tsx` — exports
  `FilterDrawer({ open, onClose, onApply, onReset, activeCount, title, children })`
  and `FilterSection({ title, children })`. Pure presentation; no DB knowledge.
- Tailwind `@source` gains `libs/gi/ui/src` (and the three page libs) so
  drawer utilities are generated; tailwind still imports theme+utilities only.
- Per page: local `draft` state seeded from the DB display state when the
  drawer opens; Apply → `database.displayX.set({ ...draft-merged })`;
  Reset → draft = documented defaults (`filterDefaults.ts` next to the drawer).
- Artifacts reuse `ArtifactFilterDisplay` unchanged (it already takes
  `filterOption` + dispatch → feed it the draft). Its internal layout is
  replaced by `FilterSection` wrappers in a follow-up inside the same task —
  sections receive the same controls, reordered.
- Weapons: extract the card body into `WeaponFilterBody({ value, onChange })`
  (presentational); the card wrapper is deleted. Page keeps bulk buttons.
- Characters: toggles already take value+onChange; search stays local.

## Active count

`activeFilterCount(defaults, value)` = number of keys whose value differs from
the default (arrays compared by length + membership). Shown on the Filters
button and in the drawer header. Reset restores exact defaults.

## Constraints

- Token styling only; no MUI chrome inside the drawer shell (MUI controls may
  remain inside sections — approach C).
- Drawer must not trap focus when closed; Escape discards draft.
- Web build and desktop build both unaffected (no Tauri calls).
- Existing display-state persistence (localStorage per db) unchanged.

## Testing

- Unit: `filterDefaults` + `activeFilterCount` (RED→GREEN).
- Drawer behavior: opening seeds draft; editing does NOT call displayX.set;
  Apply calls set once with the merged draft and closes; Reset restores
  defaults in the UI without calling set; Escape does not call set.
- Page smoke: builds; full suite green (known app.spec.tsx failure ignored).
