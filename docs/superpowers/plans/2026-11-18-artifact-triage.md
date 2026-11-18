# Artifact Triage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every artifact a KEEP / MAYBE / TRASH verdict derived from the damage its stats are worth to the best character in the user's roster, with bulk lock/unlock.

**Architecture:** A new dependency-light lib `libs/gi/triage` computes per-character stat weights from the existing damage formula data (one compiled evaluator per character, 19 evaluations against a synthetic stat line), scores artifacts against those weights (substats plus mainstat), and resolves a verdict per artifact. The Artifacts page consumes it through a local, in-memory triage view; nothing is persisted.

**Tech Stack:** TypeScript, React 19, Nx, Vitest, `@genshin-optimizer/gi/{wr,uidata,sheets,stats,util,db}`, MUI + Tailwind (existing page surfaces).

**Spec:** `docs/superpowers/specs/2026-11-18-artifact-triage-design.md`

## Global Constraints

- Nothing is written to the DB, localStorage, or the shared hub. Triage state lives in React state for the session.
- No network calls; no game process interaction.
- No new persisted keys, no new `artifactSortKeys`/filter keys, no schema migration.
- No new runtime dependencies; use the packages already in the workspace.
- Thresholds are exactly `KEEP_THRESHOLD = 12`, `MAYBE_THRESHOLD = 6` (percent damage), defined once in `libs/gi/triage/src/constants.ts`.
- Reference build, identical for every character: level 90, talents 10/10/10, constellation 0, equipped weapon, no artifacts, character's own conditionals from their loadout when one exists.
- Reference stat line (internal units, percent stats are fractions): `atk_: 1`, `critRate_: 0.6`, `critDMG_: 1.2`, `enerRech_: 1`, `eleMas: 100`, `${element}_dmg_: 0.466`.
- Tests are colocated `src/*.test.ts`, run with `yarn nx test gi-triage`.
- Commits are conventional (`feat:`, `test:`, `refactor:`).

## Review Focus

Inputs and conditions the spec implies but no single feature test covers; each gets a test in the task that owns the code.

1. A roster character with no loadout (no team, no conditionals) must still produce weights, and must not crash on missing conditional state. → Task 2.
2. An artifact whose substats include an unrevealed line (`key === ''`) or is below 5★ must score without throwing. → Task 3.
3. An empty database (no characters, no artifacts) must yield an empty result map and leave bulk buttons disabled, never "lock everything". → Task 4.
4. An off-element elemental DMG goblet must score 0 for a character of another element rather than being treated as a generic DMG% piece. → Task 2.
5. A locked artifact must keep its computed verdict (so `Unlock TRASH` is meaningful) while an equipped artifact is forced to KEEP. → Task 3.

---

## File Structure

```
libs/gi/triage/
  project.json            nx project "gi-triage", vitest test target
  tsconfig.json           extends tsconfig.base.json
  tsconfig.lib.json       src/**/*.ts, excludes tests
  tsconfig.spec.json      tests + vite config
  vite.config.mts         vitest node environment
  src/index.ts            public exports
  src/types.ts            Verdict, TriageResult, StatWeights, WeightsByChar
  src/constants.ts        thresholds, SET_IDENTITY, ER_NEED, HEAL_SHIELD_SCALING, WEIGHTS_VERSION
  src/reference.ts        REFERENCE_STATS, stat bump per key, reference data bundle
  src/weights.ts          computeStatWeights, computeRosterWeights
  src/score.ts            scoreArtifact, scoreAgainstRoster, triageArtifact
  src/compute.ts          computeTriage (roster + artifacts, async with progress)
  src/*.test.ts           colocated tests
libs/gi/ui/src/components/artifact/ArtifactCard.tsx        + optional triage prop
libs/gi/page-artifacts/src/useTriage.ts                    hook: state + progress
libs/gi/page-artifacts/src/TriageToolbar.tsx               toggle, counts, bulk actions
libs/gi/page-artifacts/src/triageView.ts                   local filter/sort helper
libs/gi/page-artifacts/src/index.tsx                       wiring
tsconfig.base.json                                         + path mapping
```

## Interfaces

These signatures are fixed for every task:

```ts
// types.ts
export type Verdict = 'keep' | 'maybe' | 'trash'
export interface TriageOwner { key: CharacterKey; value: number }
export interface TriageResult {
  verdict: Verdict
  value: number
  owners: TriageOwner[]
  future: boolean
  locked: boolean
}
/** Relative damage gain in percent per one display unit of the stat. */
export type StatWeights = Record<string, number>
export type WeightsByChar = Partial<Record<CharacterKey, StatWeights>>

// constants.ts
export const KEEP_THRESHOLD = 12
export const MAYBE_THRESHOLD = 6
export const WEIGHTS_VERSION = 1
export function verdictFor(value: number): Verdict

// reference.ts
export const REFERENCE_STATS: Readonly<Record<string, number>>
export function statBump(key: string): { internal: number; display: number }
export function buildReferenceData(database: ArtCharDatabase, charKey: CharacterKey): Data[] | undefined

// weights.ts
export function computeStatWeights(database: ArtCharDatabase, charKey: CharacterKey): StatWeights | undefined
export function computeRosterWeights(
  database: ArtCharDatabase,
  charKeys: CharacterKey[],
  onProgress?: (done: number, total: number) => void
): Promise<WeightsByChar>

// score.ts
export function scoreArtifact(artifact: ICachedArtifact, weights: StatWeights): number
export function scoreAgainstRoster(artifact: ICachedArtifact, byChar: WeightsByChar): { value: number; owners: TriageOwner[] }
export function triageArtifact(artifact: ICachedArtifact, byChar: WeightsByChar): TriageResult

// compute.ts
export function computeTriage(
  database: ArtCharDatabase,
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, TriageResult>>
```

### Task 1: Scaffold the triage lib and verdict mapping

**Files:**
- Create: `libs/gi/triage/project.json`, `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`, `vite.config.mts`
- Create: `libs/gi/triage/src/types.ts`, `src/constants.ts`, `src/index.ts`
- Create: `libs/gi/triage/src/constants.test.ts`
- Modify: `tsconfig.base.json` (paths)

**Interfaces:**
- Produces: `verdictFor`, `KEEP_THRESHOLD`, `MAYBE_THRESHOLD`, all types listed above.

- [ ] **Step 1: Copy the lib scaffold from `libs/gi/upopt`**

Copy `project.json` → rename `"name": "gi-triage"`, `sourceRoot: "libs/gi/triage/src"`. Copy `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`, `vite.config.mts` unchanged except `cacheDir`/`coverage` paths (`libs/gi/triage`). Add to `tsconfig.base.json` paths:

```json
"@genshin-optimizer/gi/triage": ["./libs/gi/triage/src/index.ts"]
```

- [ ] **Step 2: Write the failing test**

`libs/gi/triage/src/constants.test.ts`:

```ts
import { verdictFor } from './constants'

describe('verdictFor', () => {
  it('keeps at and above the keep threshold', () => {
    expect(verdictFor(12)).toEqual('keep')
    expect(verdictFor(40)).toEqual('keep')
  })
  it('marks maybes between the thresholds', () => {
    expect(verdictFor(11.99)).toEqual('maybe')
    expect(verdictFor(6)).toEqual('maybe')
  })
  it('trashes below the maybe threshold', () => {
    expect(verdictFor(5.99)).toEqual('trash')
    expect(verdictFor(0)).toEqual('trash')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `yarn nx test gi-triage`
Expected: FAIL — cannot resolve `./constants`.

- [ ] **Step 4: Implement `constants.ts`, `types.ts`, `index.ts`**

`constants.ts` holds `KEEP_THRESHOLD = 12`, `MAYBE_THRESHOLD = 6`, `WEIGHTS_VERSION = 1`, the `verdictFor` function, and three empty-but-typed tables that later tasks fill: `SET_IDENTITY: Partial<Record<ArtifactSetKey, SubstatKey[]>>`, `ER_NEED: Partial<Record<CharacterKey, number>>`, `HEAL_SHIELD_SCALING: Partial<Record<CharacterKey, SubstatKey[]>>`.

`index.ts` re-exports `types` and `constants`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `yarn nx test gi-triage`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add libs/gi/triage tsconfig.base.json
git commit -m "feat(triage): scaffold gi-triage lib with verdict thresholds"
```

### Task 2: Reference stat line and stat weights

**Files:**
- Create: `libs/gi/triage/src/reference.ts`, `src/weights.ts`
- Create: `libs/gi/triage/src/weights.test.ts`
- Test fixture helper: `libs/gi/triage/src/test-utils.ts`

**Interfaces:**
- Consumes: `verdictFor`, `ER_NEED`, `HEAL_SHIELD_SCALING` (Task 1).
- Produces: `REFERENCE_STATS`, `statBump`, `buildReferenceData`, `computeStatWeights`, `computeRosterWeights`.
- Uses from the workspace: `getTeamData`-equivalent path is **not** used here; build the bundle directly with `getCharSheet`/`getWeaponSheet`/`displayDataMap`/`allArtifactData`/`common`/`resonanceData`/`reactionData` (same merge as `libs/gi/ui/src/hooks/useCharData.ts:207-225`), `dataObjForCharacterNew` with the reference `CharInfo`, `uiDataForTeam`, `objPathValue`, `optimize` (`@genshin-optimizer/gi/wr`), `precompute` (`@genshin-optimizer/gi/wr`), `getSubstatValue` (`@genshin-optimizer/gi/util`), `getCharStat`.

- [ ] **Step 1: Write the failing test**

`libs/gi/triage/src/weights.test.ts` — use `createTestDBStorage('go')` + `new ArtCharDatabase(1, dbStorage)` from the db test pattern, add `Albedo` via `database.chars.set('Albedo', { level: 90, ascension: 6, talent: { auto: 10, skill: 10, burst: 10 }, constellation: 0 })`.

```ts
it('weights the stat the kit scales with above the one it does not', () => {
  const w = computeStatWeights(database, 'Albedo')!
  expect(w.def_).toBeGreaterThan(w.atk_)
  expect(w.hp_).toBeLessThan(0.01)
})
it('keeps crit rate and crit damage comparable', () => {
  const w = computeStatWeights(database, 'Albedo')!
  expect(w.critRate_ / w.critDMG_).toBeGreaterThan(0.5)
  expect(w.critRate_ / w.critDMG_).toBeLessThan(2)
})
it('returns weights for a character with no loadout', () => {
  expect(computeStatWeights(database, 'Albedo')).toBeDefined()
})
it('scores an off-element DMG goblet at zero', () => {
  const w = computeStatWeights(database, 'Albedo')! // geo
  expect(w.pyro_dmg_).toEqual(0)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test gi-triage -t "weights"`
Expected: FAIL — `computeStatWeights` not found.

- [ ] **Step 3: Implement `reference.ts`**

`REFERENCE_STATS` as pinned in Global Constraints, with `${element}_dmg_` resolved per character via `getCharStat(charKey).ele`. Add `statBump(key)`: for substat keys `getSubstatValue(key, 5, 'max')` → `display`, `internal = key.endsWith('_') ? display / 100 : display`; for mainstat-only keys (`*_dmg_`, `heal_`) `display = 1`, `internal = 0.01`.

`buildReferenceData(database, charKey)` assembles the same Data array `getCharDataBundle` builds, but the character object is:

```ts
{
  level: 90, ascension: 6, constellation: 0,
  talent: { auto: 10, skill: 10, burst: 10 },
  conditional: loadout?.conditional ?? {},
  hitMode: loadout?.hitMode ?? 'avgHit',
  reaction: undefined,
  infusionAura: loadout?.infusionAura ?? '',
  customMultiTargets: [],
  bonusStats: {},
  enemyOverride: {},
}
```

`loadout` is found by scanning `database.teams.values` → `loadoutData` → `database.teamChars.get(teamCharId)` for `key === charKey`. Weapon is `database.weapons.get(database.chars.get(charKey).equippedWeapon) ?? defaultInitialWeapon()`. Artifacts are always `[]`.

- [ ] **Step 4: Implement `weights.ts`**

Per character: `data = buildReferenceData(...)`; `target = uiDataForTeam({ [ck]: data }, database.gender, ck)[ck]?.target`; `display = target.data[0].display`; choose the target node per the spec's rule (configured non-`custom` `optimizationTarget` from the loadout's opt config, else the display node with the largest evaluated value whose `info.variant` is an element or `'physical'`); `nodes = optimize([targetNode], target.data[0], ({ path: [p] }) => p !== 'dyn')`; `evaluate = precompute(nodes, {}, (f) => f.path[1], 1)`.

Then for each key in `REFERENCE_STATS` plus `statBump` keys: `D0 = evaluate([{ id: '', values: REFERENCE_STATS }])[0]`, `D1 = evaluate([{ id: '', values: { ...REFERENCE_STATS, [key]: REFERENCE_STATS[key] + bump.internal } }])[0]`, `w[key] = 100 * (D1 - D0) / D0 / bump.display`.

Add `ER_NEED[charKey]` and each key in `HEAL_SHIELD_SCALING[charKey]` as extra weight when present (same percent-per-display-unit unit). `computeRosterWeights` loops characters, awaits a `setTimeout(0)` every 8 characters so the UI can paint, and calls `onProgress`.

- [ ] **Step 5: Run the test to verify it passes**

Run: `yarn nx test gi-triage`
Expected: PASS. If `def_` does not beat `atk_`, the target node picked the wrong damage entry — fix the selection rule, not the assertion.

- [ ] **Step 6: Commit**

```bash
git add libs/gi/triage/src/reference.ts libs/gi/triage/src/weights.ts libs/gi/triage/src/weights.test.ts libs/gi/triage/src/test-utils.ts
git commit -m "feat(triage): per-character stat weights from the damage engine"
```

### Task 3: Artifact scoring and verdict

**Files:**
- Create: `libs/gi/triage/src/score.ts`, `src/score.test.ts`
- Modify: `libs/gi/triage/src/constants.ts` (fill `SET_IDENTITY`)

**Interfaces:**
- Consumes: `StatWeights`, `WeightsByChar`, `verdictFor`, `KEEP_THRESHOLD`, `SET_IDENTITY`.
- Produces: `scoreArtifact`, `scoreAgainstRoster`, `triageArtifact`.

- [ ] **Step 1: Write the failing test**

```ts
const weights: StatWeights = { critRate_: 2, atk_: 0.5, pyro_dmg_: 1 }
const artifact = {
  id: 'a', setKey: 'CrimsonWitchOfFlames', slotKey: 'goblet', rarity: 5, level: 20,
  mainStatKey: 'pyro_dmg_', substats: [
    { key: 'critRate_', accurateValue: 7 },
    { key: 'atk_', accurateValue: 10 },
    { key: '', accurateValue: 0 },
  ],
  location: '', lock: false,
} as ICachedArtifact

it('sums substats and mainstat in percent damage', () => {
  // 7*2 + 10*0.5 + 46.6*1
  expect(scoreArtifact(artifact, weights)).toBeCloseTo(65.6)
})
it('lets a hidden substat line through without throwing', () => {
  expect(() => scoreArtifact({ ...artifact, substats: [{ key: '', accurateValue: 0 }] }, weights)).not.toThrow()
})
it('scores a four-star artifact without throwing', () => {
  expect(() => scoreArtifact({ ...artifact, rarity: 4 }, weights)).not.toThrow()
})
it('forces equipped artifacts to keep and leaves locked ones alone', () => {
  const byChar = { Albedo: { atk_: 1 } }
  const weak = { ...artifact, substats: [{ key: 'atk_', accurateValue: 1 }] }
  expect(triageArtifact({ ...artifact, location: 'Albedo' }, byChar).verdict).toEqual('keep')
  expect(triageArtifact({ ...weak, lock: true }, byChar)).toMatchObject({ locked: true, verdict: 'trash' })
})
it('lifts an unowned identity piece to maybe/future', () => {
  const byChar = { Albedo: { atk_: 1 } }
  const husk = { ...artifact, setKey: 'HuskOfOpulentDreams', slotKey: 'sands', mainStatKey: 'def_', location: '', lock: false }
  expect(triageArtifact(husk as ICachedArtifact, byChar)).toMatchObject({ verdict: 'maybe', future: true })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test gi-triage -t "score"`
Expected: FAIL — `scoreArtifact` not found.

- [ ] **Step 3: Implement `score.ts` and fill `SET_IDENTITY`**

`scoreArtifact` = `Σ (substat key ? accurateValue * (weights[key] ?? 0) : 0) + mainStatDisplayValue * (weights[mainStatKey] ?? 0)`, main stat value via `getMainStatDisplayValue`. `scoreAgainstRoster` = score per character, keep the top three with `value >= MAYBE_THRESHOLD`, sorted desc, and the overall max. `triageArtifact`: if `location` is set → `keep`; else `{ verdict: verdictFor(value), value, owners, future, locked }`; `future` is true only when `owners.length === 0` and the set is in `SET_IDENTITY` with the mainstat or at least 4 substat rolls in the identity family, in which case the verdict is floored to `maybe`.

`SET_IDENTITY` v1 entries: `HuskOfOpulentDreams: ['def_']`, `EmblemOfSeveredFate: ['enerRech_']`, `ViridescentVenerer: ['eleMas']`, `DeepwoodMemories: ['eleMas']`, `GildedDreams: ['eleMas']`, `FlowerOfParadiseLost: ['eleMas']`, `OceanHuedClam: ['hp_', 'heal_']`, `MaidenBeloved: ['heal_']`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn nx test gi-triage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/gi/triage/src/score.ts libs/gi/triage/src/score.test.ts libs/gi/triage/src/constants.ts
git commit -m "feat(triage): artifact scoring, verdicts and set-identity safety net"
```

### Task 4: Roster computation

**Files:**
- Create: `libs/gi/triage/src/compute.ts`, `src/compute.test.ts`
- Modify: `libs/gi/triage/src/index.ts`

**Interfaces:**
- Consumes: `computeRosterWeights`, `triageArtifact`, `WEIGHTS_VERSION`.
- Produces: `computeTriage(database, onProgress): Promise<Map<string, TriageResult>>` and `rosterCacheKey(database): string`.

- [ ] **Step 1: Write the failing test**

```ts
it('returns an empty map for an empty database', async () => {
  expect(await computeTriage(database)).toEqual(new Map())
})
it('scores every artifact owned by the database', async () => {
  const results = await computeTriage(database)
  expect(results.size).toEqual(database.arts.values.length)
  expect([...results.values()].every((r) => ['keep', 'maybe', 'trash'].includes(r.verdict))).toBe(true)
})
it('reports progress per character', async () => {
  const seen: number[] = []
  await computeTriage(database, (done) => seen.push(done))
  expect(seen.at(-1)).toEqual(database.chars.values.length)
})
it('invalidates cached weights when the roster or a weapon changes', () => {
  const before = rosterCacheKey(database)
  expect(rosterCacheKey(database)).toEqual(before)
  database.weapons.set(database.chars.values[0].equippedWeapon, { level: 20 })
  expect(rosterCacheKey(database)).not.toEqual(before)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test gi-triage -t "compute"`
Expected: FAIL — `computeTriage` not found.

- [ ] **Step 3: Implement `compute.ts`**

`rosterCacheKey(database)` = `[WEIGHTS_VERSION, ...characters sorted by key with level/talent/constellation, equipped weapon key+level].join('|')`. Module-level `Map<string, WeightsByChar>` caches weights per session keyed by that string; `computeTriage` reuses the cached entry when the key matches and otherwise computes, stores, and evicts the previous entry. That is the whole cache — nothing persisted.

Roster = `database.chars.values.map((c) => c.key)`. `byChar = await computeRosterWeights(database, roster, onProgress)`. For each `database.arts.values`, `results.set(art.id, triageArtifact(art, byChar))`. Return the map.

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn nx test gi-triage`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add libs/gi/triage/src/compute.ts libs/gi/triage/src/compute.test.ts libs/gi/triage/src/index.ts
git commit -m "feat(triage): roster-wide triage computation"
```

### Task 5: Artifact card badge

**Files:**
- Create: `libs/gi/triage/src/label.ts`, `src/label.test.ts`
- Modify: `libs/gi/ui/src/components/artifact/ArtifactCard.tsx`

**Interfaces:**
- Consumes: `TriageResult`.
- Produces: `triageLabel(result: TriageResult): string` — e.g. `"KEEP 27% · Itto, Noelle"`, `"MAYBE 8% · future"`, `"TRASH 2%"`.

- [ ] **Step 1: Write the failing test**

```ts
it('names the top owners', () => {
  expect(triageLabel({ verdict: 'keep', value: 26.8, owners: [{ key: 'Itto', value: 26.8 }, { key: 'Noelle', value: 21 }], future: false, locked: false }))
    .toEqual('KEEP 27% · Itto, Noelle')
})
it('labels the safety net', () => {
  expect(triageLabel({ verdict: 'maybe', value: 0, owners: [], future: true, locked: false })).toEqual('MAYBE · future')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test gi-triage -t "label"`
Expected: FAIL.

- [ ] **Step 3: Implement `label.ts`, then add the card prop**

Label: verdict upper-cased, value rounded and suffixed with `%` when owners exist, then `· owner names` or `· future`. `ArtifactCardObj` gains an optional `triage?: TriageResult` prop; when present render a small badge (`SqBadge` or `Chip`, colour by verdict) with the label in the card header area, and nothing changes when absent.

- [ ] **Step 4: Verify**

Run: `yarn nx test gi-triage && yarn nx build frontend`
Expected: tests PASS, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add libs/gi/triage/src/label.ts libs/gi/triage/src/label.test.ts libs/gi/ui/src/components/artifact/ArtifactCard.tsx
git commit -m "feat(triage): artifact card verdict badge"
```

### Task 6: Triage view on the artifacts page

**Files:**
- Create: `libs/gi/page-artifacts/src/triageView.ts`, `src/triageView.test.ts`
- Create: `libs/gi/page-artifacts/src/useTriage.ts`, `src/TriageToolbar.tsx`
- Modify: `libs/gi/page-artifacts/src/index.tsx`

**Interfaces:**
- Consumes: `computeTriage`, `TriageResult`, `triageLabel`.
- Produces: `applyTriageView(ids, results, filter): string[]` (filter is `'all' | Verdict`, sorts by value desc, drops ids without a result) and `useTriage(database)` returning `{ results, status, progress, start }`.

- [ ] **Step 1: Write the failing test**

```ts
it('filters by verdict and sorts by value', () => {
  const results = new Map([
    ['a', { verdict: 'trash', value: 1, owners: [], future: false, locked: false }],
    ['b', { verdict: 'keep', value: 30, owners: [], future: false, locked: false }],
  ]) as Map<string, TriageResult>
  expect(applyTriageView(['a', 'b'], results, 'keep')).toEqual(['b'])
  expect(applyTriageView(['a', 'b'], results, 'all')).toEqual(['b', 'a'])
})
it('drops artifacts with no result', () => {
  expect(applyTriageView(['a', 'zzz'], new Map(), 'all')).toEqual([])
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn nx test page-artifacts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `triageView.ts`, `useTriage.ts`, `TriageToolbar.tsx`**

`useTriage`: `status: 'idle' | 'running' | 'done'`, `results: Map<string, TriageResult> | undefined`, `progress: { done, total }`, `start()` runs `computeTriage(database, (done, total) => ...)` once and stores the map; re-running replaces it. Cache the weights inside `computeTriage`'s own call only — no persistence.

`TriageToolbar`: toggle button, counts per verdict from `results`, segmented verdict filter, and two bulk buttons wired to `ArtifactRedButtons`-style handlers (`database.arts.set(id, { lock: true })` / `{ lock: false }`) over the currently visible keep/trash ids with `window.confirm`.

- [ ] **Step 4: Wire `index.tsx`**

When the toggle is on: `filteredArtIds` comes from `applyTriageView(...)`; the existing `Sort` control is disabled with a hint; `ArtifactFilter` stays mounted but collapsed; `ArtifactCard` receives `triage={results?.get(artId)}`. The toolbar shows a one-line explanation — `"% damage this piece's stats are worth for its best owner"` — plus progress while `status === 'running'`. When off, behaviour is byte-for-byte the current page.

- [ ] **Step 5: Verify**

Run: `yarn nx test page-artifacts && yarn nx typecheck page-artifacts && yarn nx build frontend`
Expected: PASS and a clean build.

- [ ] **Step 6: Commit**

```bash
git add libs/gi/page-artifacts/src
git commit -m "feat(triage): triage view with verdict filter and bulk lock/unlock"
```

### Task 7: Calibrate against the real database

**Files:**
- Modify: `libs/gi/triage/src/constants.ts` (thresholds only, if calibration says so)

**Interfaces:** none new.

- [ ] **Step 1: Run the app on the real DB**

Run: `yarn frontend`, open Artifacts, turn triage on, note the three counts and spot-check five artifacts by hand (one known-good crit piece, one DEF% piece for a DEF scaler, one ER Emblem piece, one obviously dead piece, one equipped piece).

- [ ] **Step 2: Sanity-check the distribution**

Keep the thresholds if `KEEP` lands between 5% and 25% of the collection and every spot-check matches intuition. If both `KEEP` and `MAYBE` are under 1% (weights too small) or over 60% (weights too large), adjust `KEEP_THRESHOLD`/`MAYBE_THRESHOLD` in one commit with the old and new values in the message. Do not adjust scoring to fit thresholds.

- [ ] **Step 3: Commit the calibration**

```bash
git add libs/gi/triage/src/constants.ts
git commit -m "chore(triage): calibrate verdict thresholds against a real collection"
```
