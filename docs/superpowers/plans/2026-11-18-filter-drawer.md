# Filter Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Artifacts / Weapons / Characters filters into one shared right-side Radix drawer with a readable section order and draft **Apply** / **Reset**, leaving the pages with a slim toolbar.

**Architecture:** A shared presentation-only `FilterDrawer` + `FilterSection` live in `libs/gi/ui/src/components/filters/`. Each page owns a draft copy of its DB display filter state; Apply writes only filter keys, Reset restores documented defaults in the draft. Artifacts reuse `ArtifactFilterDisplay` (fed the draft); Weapons get an extracted `WeaponFilterBody`; Characters move their toggles as-is. Tailwind scans the touched libs via new `@source` entries.

**Tech Stack:** React 18, Radix Dialog, Tailwind v4 utilities on `--go-*` tokens, MUI controls inside sections, vitest + testing-library.

**Spec:** `docs/superpowers/specs/2026-11-18-filter-drawer-design.md`

## Global Constraints

- Token utilities only for the drawer shell (`bg-surface`, `border-line`, `rounded-go`, `shadow-go-lg`, `text-title`, `text-label`, `animate-go-in`, `focus-visible:ring-2 focus-visible:ring-accent/60`). No MUI in the shell.
- Drawer: Radix `Dialog` right-side; overlay `z-[3000] bg-black/60`, content `z-[3001]`; Escape/backdrop close discarding the draft.
- Draft semantics: no `display*.set` call until Apply. Live exceptions (decided): search fields and artifact `effFilter`.
- Apply writes filter keys only — never `sortType`, `ascending`, `editWeaponId`.
- Reset is draft-local; never `displayCharacter.set({action:'reset'})` (does not exist).
- Active count: toolbar badge from committed state, drawer header from draft; each changed key = 1; arrays count 1.
- Artifact defaults come from `initialFilterOption()` (`libs/gi/schema/src/filterOption.ts`).
- Weapon display schema defaults: `rarity/weaponType/locked` = all keys, `locked` = ['locked','unlocked'], `showEquipped/showInventory` = true, `locations` = []. Character: `weaponType/element/rarity` = all keys.
- Tests run from `apps/frontend`: `& "C:\Users\iki\.bun\bin\bun.exe" x vitest run <files>` (PowerShell; bun full path). Known pre-existing failure: `app.spec.tsx`.
- Build: from `D:/Playground/go-src-probe`: `& "C:\Users\iki\.bun\bin\bun.exe" nx build frontend`.

## Review Focus

1. **Draft isolation** — editing any drawer control (except the two live exceptions) must not change the grid until Apply. Test: Task 1's drawer test asserts `onApply` not called during edits.
2. **Apply scope** — Apply must not touch sort/ascending/edit ids. Test: Task 3 asserts the exact `set` payload keys.
3. **Reset fidelity** — Reset restores schema defaults (weapons: `showEquipped/showInventory` default **true** — a `false` default here silently hides inventory). Test: Task 3 default-object equality.
4. **Count correctness** — badge counts keys differing from defaults; zero on fresh state. Test: Task 2 artifacts count.
5. **Escape/backdrop** — closing without Apply leaves DB untouched and re-opening reseeds from committed state. Test: Task 1.

---

### Task 1: Shared drawer + defaults/count helpers

**Files:**
- Create: `libs/gi/ui/src/components/filters/FilterDrawer.tsx` — `FilterDrawer({ open, onClose, onApply, onReset, activeCount, title, children })`, `FilterSection({ title, children })`
- Create: `libs/gi/ui/src/components/filters/filterCount.ts` — `activeFilterCount(defaults: Record<string, unknown>, value: Record<string, unknown>): number` (arrays: equal iff same length and same members; otherwise `Object.is` per key; missing value treats as default)
- Modify: `libs/gi/ui/src/components/filters/index.ts` (barrel, create if absent) + `libs/gi/ui/src/index.ts` export
- Modify: `apps/frontend/src/tailwind.css` — add the four `@source` lines from the spec
- Test: `apps/frontend/src/app/filters/filterDrawer.spec.tsx` (count unit + drawer behavior)

**Interfaces:**
- Produces: `FilterDrawer`, `FilterSection`, `activeFilterCount`.

- [ ] **Step 1: Write the failing tests**

```tsx
// count
expect(activeFilterCount({ a: [], b: true }, { a: [], b: true })).toBe(0)
expect(activeFilterCount({ a: [], b: true }, { a: ['x'], b: true })).toBe(1)
expect(activeFilterCount({ a: [] }, {})).toBe(0)
// drawer: edits don't apply; Apply fires once; Reset calls onReset; Escape calls onClose only
```

- [ ] **Step 2: Run** — FAIL (module missing).
- [ ] **Step 3: Implement.** Drawer: `Dialog.Root open onOpenChange`, `Portal`, `Overlay`, `Content` (fixed right, `w-[min(92vw,400px)]`, flex column, `animate-go-in`), header (`text-title` + count chip), scrollable body (`overflow-y-auto p-4 space-y-4`), footer (Reset ghost → `onReset`; Apply primary → `onApply`, `bg-accent text-accent-fg`). `FilterSection` = `text-label` heading + divider + `space-y-2`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `feat(ui): shared filter drawer + filter count helper`.

### Task 2: Artifacts page

**Files:**
- Modify: `libs/gi/page-artifacts/src/ArtifactFilter.tsx` — replace the inline card with `<FilterDrawer>` wiring; keep `ArtifactRedButtons` exported unchanged
- Modify: `libs/gi/page-artifacts/src/index.tsx` — toolbar row above the grid: existing `ShowingAndSortOptionSelect` + new Filters button (lucide `SlidersHorizontal`, badge = committed count)
- Modify: `libs/gi/ui/src/components/artifact/ArtifactFilterDisplay.tsx` — wrap the existing controls in `FilterSection` groups in the decided order: Sets → Main stat → Substats → Slot → Rarity & level → Inventory → Roll value. No control logic changes; `effFilter` stays live.

**Interfaces:**
- Consumes: Task 1 drawer + count; `initialFilterOption()`.
- Produces: artifact page API unchanged (`ArtifactFilter` props same).

- [ ] **Step 1: Failing test** — `apps/frontend/src/app/filters/artifactDrawer.spec.tsx`: with mocked `useDatabase`/`useDisplayArtifact`, render toolbar+drawer harness; changing rarity in the draft does not call `displayArtifact.set`; Apply calls it once with `filterOption` containing the draft; count badge shows 0 initially.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Draft state seeded on open from committed `filterOption`; Apply `set({ filterOption: merged })`; Reset `setDraft(initialFilterOption())`; keep the "n / total" text in the toolbar.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `feat(artifacts): filters move into side drawer with apply/reset`.

### Task 3: Weapons page

**Files:**
- Modify: `libs/gi/page-weapons/src/WeaponFilter.tsx` — export `WeaponFilterBody({ value, onChange, filteredIds })` holding the controls in sections (Type → Rarity → Inventory) with no DB writes; `WeaponFilter` becomes the drawer wiring; keep `WeaponRedButtons`
- Modify: `libs/gi/page-weapons/src/index.tsx` — toolbar row: search (stays live, moves next to Showing/Sort), ShowingAndSort, Filters button

- [ ] **Step 1: Failing test** — `weaponsDrawer.spec.tsx`: default draft equals schema defaults incl. `showEquipped: true, showInventory: true`; Apply payload has exactly the filter keys (no `sortType`/`editWeaponId`); Reset returns draft to defaults.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** per spec's decided order; totals computed inside the body from `filteredIds`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `feat(weapons): filters move into side drawer with apply/reset`.

### Task 4: Characters page

**Files:**
- Modify: `libs/gi/page-characters/src/index.tsx` — remove the inline filter card; keep `ShowingAndSortOptionSelect` + Filters button in a toolbar; drawer holds `WeaponToggle`, `ElementToggle`, `CharacterRarityToggle`, and the name search (search stays live).

- [ ] **Step 1: Failing test** — `charactersDrawer.spec.tsx`: toggling element in draft does not call `displayCharacter.set`; Apply calls it once with `{ weaponType, element, rarity }` only.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `feat(characters): filters move into side drawer with apply/reset`.

### Task 5: Build + desktop sync

- [ ] **Step 1:** `bun nx build frontend` green.
- [ ] **Step 2:** full per-file suite (list the five spec files + prior ones) green except `app.spec.tsx`.
- [ ] **Step 3:** from `genshin-optimizer-desktop/src-tauri`: `& "C:\Program Files\Git\bin\bash.exe" tools/sync_dist.sh`, then `cargo build --release --target-dir target-ds` (PATH `D:/Playground/tools/mingw64/bin`). Hand the smoke test to the human.
