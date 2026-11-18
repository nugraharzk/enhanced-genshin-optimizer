# Artifact Triage — design

Date: 2026-11-18
Status: design for approval (approach A + C safety net, picked in conversation;
builder check passed, decisions below)

## Intent

The Artifacts page can filter, sort and bulk-lock, but it cannot answer the
question the user actually has: **"is this piece worth keeping, for anyone I
own?"** Today that is manual work — eyeball the substats, mentally run the
character's stat priority, decide.

Rarity is explicitly not the goal. The user does not care how statistically
lucky a piece is. What matters is value in game terms: how much damage the
piece's stats are worth to a character who can use them. Crit/ATK% is the
common case; DEF% (Itto, Noelle), HP% (Kokomi, Neuvillette), ER% (Xiangling,
Raiden, Emblem users) and EM (reaction holders) must not be scored as trash
just because they are not crit.

## Goals

- One verdict per artifact: **KEEP / MAYBE / TRASH**, derived from a numeric
  score that means "% damage this piece's stats are worth to its best owner".
- The owner is named: `best for: Itto 27% · Noelle 21%`, so a verdict is
  explainable and arguable.
- Bulk actions that apply a verdict: lock KEEP, unlock TRASH. Never delete
  automatically; the existing delete button stays as-is.
- Everything runs offline in the app. No network, no game process, no new
  persisted schema.

## Non-goals

- No auto-delete, no "sold" concept, no changes to `lock` semantics.
- No rarity/percentile metric (`probability()` stays unused for this).
- No Akasha/Enka/HoYoLAB calls, no percentile against other players.
- No weapons/characters triage in v1.
- No new artifact sort key or filter key in the persisted display state (see
  "UI" for why).
- No tuning UI for thresholds in v1.

## Anti-goals

- A verdict the user cannot explain. Every number must be traceable to
  "damage for character X at reference build".
- Trashing artifacts that are useful to a character the user does not own yet.
- A first-run cost that makes the Artifacts page feel broken.

## Constraints

- **Shared database.** `go-db.json` is written by both the web build and the
  desktop build, so any new persisted key or enum value can break the other
  build's zod parse. v1 persists nothing.
- **No game contact.** Damage is computed from the DB and the data already
  vendored in `libs/gi/stats` and the formula data. Nothing here reads the
  game.
- **Reused pieces** (verified in this tree):
  - `getArtifactEfficiency(artifact, filter)` in
    `libs/gi/util/src/artifact/artifact.ts` — RV relative to a substat filter,
    already on `ArtifactCard` and used as a sort key. Its `maxEfficiency`
    already handles `unactivatedSubstats`.
  - `getSubstatRolls`, `getSubstatValue`, `getMainStatValue` in the same file.
  - `precompute(nodes, initial, binding, slotCount)` in
    `libs/gi/wr/src/optimization.ts:72` — compiles formula trees into a JS
    evaluator; used by `upopt` (`upOpt.ts:136`) and solver workers.
  - `getTeamData` → `uiDataForTeam(...)[ck].target.data[0]` →
    `objPathValue(workerData.display, path)` — the path `TabOptimize` uses
    (`TabOptimize/index.tsx:334-352`).
  - `ArtifactRedButtons` — bulk unequip/delete/lock/unlock over
    `filteredArtIds`; delete already skips locked artifacts.
  - `dataObjForCharacter` in `libs/gi/wr/src/api.ts` — a gear-free character
    data source (see note on conditionals below).

## Approaches considered

**A. Per-character stat weights from the damage engine.** For each owned
character, evaluate the target damage with and without a stat bump; weight =
relative damage gain per unit. Score an artifact by `Σ value × weight`,
including mainstat. Verdict = best score across the roster.
- Correct for every stat the kit actually scales with, DEF% and HP% included,
  with no curated per-character data.
- Automatically right for new characters.
- Blind spots: stats that do not appear in damage (ER, healing/shield scaling),
  and characters the user does not own.

**B. Curated per-character "useful substats" table + existing RV.** Cheap and
explainable, but a maintenance burden on every new character and only knows
useful/not-useful, not how much. Rejected as the primary mechanism.

**C. Global RV (crit/ATK%/ER/EM) + per-set exceptions.** Cheapest, and exactly
what the user said is not enough. Kept only as the safety net for artifacts
that have no owner in the roster.

**Picked: A, with C as the safety net.** A answers the question as asked; C
covers A's future-proofing hole. B survives only as two small explicit tables
(ER needs, set identity), not as the engine.

## Design

### 1. Reference build

Weights must describe a character's stat priority, not their current gear.
Reference, identical for every character:

- level 90, talents 10/10/10, constellation 0,
- the equipped weapon, else no weapon bonus,
- no artifacts,
- the character's **own conditionals ON**, `hitMode: 'avgHit'`, no reaction,
  standard enemy (level 100, 10% RES), solo — no team buffs,
- plus a **fixed synthetic stat budget** so weights are measured on a realistic
  stat line instead of a naked level-90 sheet: ATK% +100, CR +60, CD +120,
  ER +100, EM +100, elemental DMG +46.6. The budget is the same for everyone
  and is not the user's gear.

The budget matters: with a naked 5% CR / 50% CD sheet, one CD roll is worth
~0.4% while one CR roll is worth ~1.9%, so every CD piece reads as trash. At
CR 65 / CD 170 the two land near the classic 1:2 balance, which is the
behaviour the user expects from "crit matters".

Conditionals ON is also deliberate: Itto's DEF→ATK conversion is gated on his
burst conditional, so with conditionals off his DEF% weight collapses — and
DEF% for Itto is one of the two cases this feature exists for.

### 2. Weights per character

For character `c` and every stat key the artifact system can produce — the 10
substat keys plus the mainstat-only keys (`*_dmg_`, `heal_`, and the percentage
families) — compute the weight **per display unit**:

```
D0 = targetDamage(c, reference)
D1 = targetDamage(c, reference with stat i bumped by one max 5★ roll)
w[c][i] = (D1 - D0) / D0 / bump_i        // relative damage per unit of stat i
```

Per-unit weights (not per-roll) mean main-stat-only keys need no invented
denominator, and elemental DMG%, physical DMG% and heal% are ordinary keys.
Off-element DMG% gets weight 0 for free, because no formula reads it.

Target node selection, deterministic:

1. the character's configured `optimizationTarget` if the loadout's opt config
   has a non-`custom` numeric target,
2. otherwise the display damage node with the **largest evaluated value** at
   the reference build, restricted to nodes whose `info.variant` is an element
   or `physical`. Heal/shield/buff/duration nodes are excluded by variant.

"Largest evaluated value" is mechanical and needs no per-character table, no
multiplier introspection, and no curated data.

Extras the damage target cannot see, in one constants module, additive to the
engine weights:

- `ER_NEED: Partial<Record<CharacterKey, number>>` — ER weight for characters
  whose rotation depends on it (Xiangling, Raiden, Bennett, Yelan, …).
  Characters absent from the table get ER weight 0.
- `HEAL_SHIELD_SCALING: Partial<Record<CharacterKey, SubstatKey[]>>` — HP%/ATK%
  weight for healers/shielders (Kokomi, Baizhu, Zhongli), on the same scale.

Both are versioned with the weights cache, not with the DB.

### 3. Artifact score

```
score(a, c) = Σ_{every stat the artifact has} value(a, stat) * w[c][stat]
```

Substats and mainstat both count, in the same unit. The result is "% damage at
the reference build", comparable across slots and characters.

`value(a, c) = max over roster of score(a, c)`; owners sorted, top three shown.
Scored **as the artifact is now**: current level, current substats, plus the
unactivated 4th substat when its key is already known. Upgrades to +20 are not
simulated — triage judges what the piece is, not what it might become.

Force rules, applied after scoring:

- equipped by anyone → **KEEP** (never suggest removing someone's gear),
- locked → verdict computed normally, rendered with a `locked` mark, and never
  auto-changed. Locked pieces may appear in TRASH; `Unlock TRASH` is how the
  user acts on them. Nothing flips a lock on its own.

### 4. Verdict thresholds

```
KEEP   value >= 12
MAYBE  6 <= value < 12
TRASH  value < 6
```

Named constants in one module, fixed in v1, no UI. One tuning pass expected
after the first real run.

### 5. Safety net (future-proofing)

An artifact with no owner still has value if its set is defined by its stat.
`SET_IDENTITY` (one table, ~10 entries) maps set → stat family: Husk → DEF%,
Emblem → ER%, VV/Deepwood/Gilded → EM, Ocean-Hued/Maiden → HP%/heal, …

Trigger, concretely: `owners(a)` = characters whose score for `a` is at least
MAYBE. If `owners(a)` is empty **and** `a`'s set matches `SET_IDENTITY` with
the mainstat or at least 4 substat rolls in that family, the verdict floor is
MAYBE, tagged `future`. Otherwise an unowned piece is TRASH.

Without the explicit "no owners" trigger the net would never fire, because any
artifact scores a nonzero amount for some ATK character.

### 6. Computation and caching

- On demand via the Triage toggle, never on page load, in a Web Worker using
  the existing worker pattern.
- Weights cached in memory per roster, invalidated by a hash of
  `{roster keys, equipped weapons, talents, data version, constants version}`.
- Artifact scores recomputed when the artifact list changes; ~11k pieces × ≤18
  stats is trivial.
- Nothing is written to the DB, localStorage, or the shared hub.

### 7. UI

Entry point on the Artifacts page, next to `ArtifactRedButtons`:

- `Triage` toggle. When on: summary counts
  (`KEEP 132 · MAYBE 88 · TRASH 401`), a verdict segmented filter
  (all/keep/maybe/trash), and score-descending order.
- The triage view filters and sorts the id list **locally**. It does not write
  `displayArtifact` — that is what keeps the shared DB and the desktop/web
  builds untouched. The existing Sort control is disabled in triage mode with a
  hint.
- `ArtifactCard` gains one optional prop (`triage?: { verdict, value, owners,
  future, locked }`). Present → verdict badge plus `best for:` line; absent →
  nothing changes for other callers.
- Bulk actions in triage mode: `Lock KEEP` and `Unlock TRASH`, each behind the
  existing confirm pattern, over the currently visible triage subset only, and
  no-ops on pieces already in the target state.
- First run shows progress (`weighing 12/47 characters`) and a one-line
  explanation of the number.

## Approximations and known limitations

- **One target per character.** Split-scaling kits (one skill on DEF, burst on
  ATK) get the weight of their largest damage node only.
- **ER is not damage.** Covered by `ER_NEED` only.
- **Healing/shield-only scaling** covered by `HEAL_SHIELD_SCALING` only.
- **Transformative-reaction damage** (hyperbloom/burgeon) is not a target in
  the current formula data; EM-only builds rely on the set-identity net.
- **Solo weights.** No team buffs, so ATK% weighs slightly higher than it would
  next to Bennett. Deliberate: triage needs a stable priority, not a
  team-specific one.
- **Conditonals ON** approximates "kit fully active" and can overstate a
  conditional the user never maintains.
- **Judged at current level.** A +0 piece with good substats scores low by
  design; level it before triaging.
- **Cost is unbenchmarked.** 20-ish evaluations per character on a compiled
  node should be milliseconds; a worker is used because a blocked main thread
  on first run is the worse failure mode.

## Testing

- Unit: weight computation for a crit DPS (Itto) and a non-scaling stat —
  Itto's DEF% must be in the top three, and an unrelated stat must be ~0.
- Unit: score composition with a supplied weight table — substats, mainstat,
  and a mainstat-only key (`pyro_dmg_`) all contribute; off-element DMG% is 0.
- Unit: `owners` / verdict boundaries at the threshold constants; equipped →
  KEEP; locked → verdict unchanged and not auto-written; `SET_IDENTITY` floor
  fires only when `owners` is empty.
- Unit: cache key changes when the roster, a weapon, or the constants version
  changes.
- UI: triage toggle renders counts and badges; the local verdict filter does
  not call `displayArtifact.set`; `Lock KEEP` locks exactly the visible keep
  set; `Unlock TRASH` unlocks exactly the visible trash set.
- Regression: full suite green (the pre-existing `app.spec.tsx` failure is
  ignored, per the filter-drawer spec).

## Decisions made in the builder check

Settled here rather than asked:

1. Main-stat-only keys are first-class: weights are per unit, so `*_dmg_` and
   `heal_` need no invented roll denominator; off-element DMG% is 0 from the
   engine.
2. Reference adds a fixed synthetic stat budget, otherwise CD is structurally
   undervalued against CR.
3. Conditionals ON for the character's own kit; no reaction; avgHit.
4. Target choice: configured non-custom target, else the largest evaluated
   damage node.
5. Verdict by `owners` (score ≥ MAYBE), which is what makes the set-identity
   net reachable.
6. Locked pieces keep their verdict and are surfaced, not forced to KEEP;
   `Unlock TRASH` acts on them.
7. Score is current state, not simulated +20 potential.
8. No new persisted keys anywhere.
