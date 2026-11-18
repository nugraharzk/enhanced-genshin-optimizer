# Duplicate Finder Hash Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `findDuplicateGroups` avoid scanning every bucket candidate for full artifacts, keeping output identical to the current behavior.

**Architecture:** Candidate generation changes from "all unclaimed in the bucket" to a superset per head: an exact substat signature map for full heads, and the existing `(bucket, level)` list for partial heads. `findDups` stays the final filter, so matching rules are unchanged.

**Tech Stack:** TypeScript, Vitest (`libs/gi/util/vitest.config.ts`).

**Spec:** `docs/superpowers/specs/2026-11-18-dup-finder-hash-grouping-design.md`

> **Implementation note:** Task 2 was built as revised in the spec's
> "Revision" section: every head uses the signature lookup, and only heads
> with a repeated substat key fall back to the whole group. Task 1's partial
> cases were corrected to match production: a partial artifact does not match
> a full copy.

## Global Constraints

- Output must match the original `DupContent` loop exactly, including group order. That loop called `database.arts.findDups(art, ids).duplicated`, per commit `802ce088^`.
- `findDups` behavior is not changed. `duplicated` requires equal `level`; lower-level copies are `upgraded`, not duplicates.
- No public API change: `findDuplicateGroups(arts, findDups)` keeps its signature.
- No SQLite, no backend.
- Changes are left in the working tree. No commits, per the project's commit rule.

## Review Focus

1. **Partial substats (empty slot as wildcard).** A head with an empty substat slot matches a copy that has that substat anywhere. Test: Task 1, `matches a partial head against a full copy`.
2. **Lower-level copy is an upgrade, not a duplicate.** Test: Task 1, `does not group a lower-level copy`.
3. **Empty key with a stray value.** An empty-key substat ignores its value. Test: Task 1, `ignores the value of an empty substat slot`.

## Task 1: Correct the test oracle and add equivalence coverage

**Files:**
- Modify: `libs/gi/util/src/artifact/dupGroups.test.ts` (the `findDups` mirror, the `reference` function, and the test cases)

**Interfaces:**
- Consumes: `findDuplicateGroups` from `./dupGroups` (unchanged in this task)
- Produces: a test file whose oracle matches production `ArtifactDataManager.findDups` `duplicated` exactly

Background: the test mirror currently sets `duplicated` to "candidates that are not identical", which is the upgrade set. The production predicate is:

```ts
const duplicated = candidates.filter(
  (c) =>
    level === c.level &&
    substats.every(
      (s) =>
        !s.key ||
        c.substats.some((cs) => s.key === cs.key && s.value === cs.value)
    )
)
```

Where `candidates` is the existing bucket, `level >= c.level`, and positional substat filter in the mirror. Copy the mirror's candidate filter as-is.

- [ ] **Step 1: Fix the mirror's `duplicated` predicate**

Replace the `duplicated` block in the `findDups` mirror with the production predicate above.

- [ ] **Step 2: Update the test that encoded the wrong semantics**

Rename `groups a lower-level copy with its better original` to `does not group a lower-level copy`, and change its expectation to `[]`. Remove the `c` artifact from that test, since it is not needed.

- [ ] **Step 3: Add the new cases**

Add these cases to the `describe` block:

```ts
it('matches a partial head against a full copy', () => {
  const arts = [
    art({ id: 'a', substats: [{ key: 'critRate_', value: 3.1 }, { key: '', value: 0 }, { key: '', value: 0 }, { key: '', value: 0 }] }),
    art({ id: 'b' }),
  ]
  expect(run(arts)).toEqual([['a', 'b']])
})

it('ignores the value of an empty substat slot', () => {
  const arts = [
    art({ id: 'a', substats: [{ key: 'critRate_', value: 3.1 }, { key: '', value: 9 }, { key: '', value: 0 }, { key: '', value: 0 }] }),
    art({ id: 'b', substats: [{ key: 'critRate_', value: 3.1 }, { key: '', value: 0 }, { key: '', value: 0 }, { key: '', value: 0 }] }),
  ]
  expect(run(arts)).toEqual([['a', 'b']])
})
```

- [ ] **Step 4: Replace the randomized test's data generator**

The current generator uses patterned values and always fills all four substats. Replace it with a seeded PRNG (a fixed integer seed and an LCG) that produces:
- 500 artifacts over 2 sets, 2 rarities, 5 slots, 4 main stats, levels 0 to 20 in steps of 4
- substats drawn from 5 keys, with values in 0 to 3, and each slot empty with probability 0.3

Keep the `expect(run(arts)).toEqual(reference(arts, byId))` assertion.

- [ ] **Step 5: Run the tests to confirm the baseline**

Run from `libs/gi/util`: `npx vitest run src/artifact/dupGroups.test.ts`
Expected: all tests PASS against the current pairwise `findDuplicateGroups`. This proves the oracle matches current behavior, and the new cases pin the semantics the new code must keep.

If any test FAILS, stop and report which one. Do not change `dupGroups.ts` in that case.

## Task 2: Signature-based candidate generation

**Files:**
- Modify: `libs/gi/util/src/artifact/dupGroups.ts`

**Interfaces:**
- Consumes: `DupArtifact` type from the same file (unchanged)
- Produces: `findDuplicateGroups<T extends DupArtifact>(arts: readonly T[], findDups: (art: T, ids: string[]) => { duplicated: T[] }): string[][]` (unchanged signature)

- [ ] **Step 1: Confirm the tests fail only if behavior breaks**

No code change yet. Run `npx vitest run src/artifact/dupGroups.test.ts` from `libs/gi/util` and confirm the same green result as Task 1 Step 5.

- [ ] **Step 2: Rewrite `findDuplicateGroups`**

Implement these pieces inside `dupGroups.ts`:

- `groupKey(a)`: `${a.setKey}|${a.rarity}|${a.slotKey}|${a.mainStatKey}|${a.level}`. This is the bucket key plus level, because `duplicated` requires equal level.
- `signature(a)`: for a full artifact (`substats.length === 4` and every `key` set), sort the entries by key and join them as `key:value` with `|`. Return `undefined` for partial artifacts.
- Build `buckets: Map<groupKey, T[]>` in input order, and `sigs: Map<groupKey + signature, string[]>` in input order, for full artifacts only.
- Keep `remaining: Set<string>` of unclaimed ids, as today.
- Iterate `arts` in input order. For each `art`:
  - skip if `!remaining.delete(art.id)`
  - if `art` is full: `candidates = (sigs.get(groupKey + sig) ?? []).filter(id => remaining.has(id))`
  - else: `candidates = buckets.get(groupKey(art)).map(a => a.id).filter(id => remaining.has(id))`
  - if `candidates.length === 0`, continue
  - `const { duplicated } = findDups(art, candidates)`
  - if `!duplicated.length`, continue
  - push `[art.id, ...duplicated ids]` and delete those ids from `remaining`

Notes for the implementer:
- Keep the groups in the same order the current code produces: group order follows the head's input position, and duplicates follow input order inside each list.
- Do not call `findDups` with ids that are not in `remaining`.
- Keep the file's doc comment, updated to say that full heads use a signature prefilter and `findDups` remains the final check.

- [ ] **Step 3: Run the tests**

Run from `libs/gi/util`: `npx vitest run src/artifact/dupGroups.test.ts`
Expected: all tests PASS, including the randomized equivalence test.

If the equivalence test fails, compare the two outputs for the first differing group before changing anything else.

## Task 3: Verify performance and types

**Files:**
- None modified. Scratch benchmark stays in the session scratchpad.

**Interfaces:**
- Consumes: `findDuplicateGroups` from Task 2
- Produces: before and after timing numbers for the single-bucket case

- [ ] **Step 1: Re-run the single-bucket benchmark**

Use the existing scratchpad file `bench2.ts`. Bundle and run it from the scratchpad directory:

```bash
cd <scratchpad>
/d/Playground/go-src-probe/node_modules/.bin/esbuild bench2.ts --bundle --platform=node --outfile=bench2.cjs --log-level=warning && node bench2.cjs
```

Expected: 2k, 4k, and 8k complete in well under the earlier 170 ms, 620 ms, and 1,183 ms. Scaling should be close to linear, not quadratic. The pre-change numbers are the baseline in the design doc.

- [ ] **Step 2: Typecheck the package**

Check `libs/gi/util/project.json` for the typecheck target, then run it. If none exists, run `npx tsc --noEmit -p libs/gi/util/tsconfig.lib.json`.
Expected: no new errors in `dupGroups.ts` or `dupGroups.test.ts`.

- [ ] **Step 3: Report**

Report the before and after numbers, the test result, and the typecheck result. Leave the changes uncommitted.

## Self-Review

- **Spec coverage:** Goals (same output, no full scan for full artifacts, findDups as the check) map to Tasks 1 and 2. Verification (equivalence, existing tests, benchmark) maps to Tasks 1 and 3. Non-goals are not touched.
- **Type consistency:** `findDuplicateGroups` signature is unchanged in both tasks. `DupArtifact` is unchanged.
- **Proportion:** the plan is shorter than the spec plus the code it names.
- **Finding for the user:** the test oracle added in commit `802ce088` returned the upgrade set as `duplicated`. The "groups a lower-level copy" test encoded that. Task 1 corrects it and changes that test's expectation to `[]`. This is my call, based on the original `DupContent` loop, which used the production `findDups`.
