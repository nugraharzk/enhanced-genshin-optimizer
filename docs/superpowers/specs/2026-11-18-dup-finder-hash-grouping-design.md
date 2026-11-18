# Duplicate Artifact Finder: Hash Grouping (Design)

Status: approved, revised during implementation (see "Revision" below)
Date: 2026-11-18

## Intent

The duplicate finder on the artifacts page (`DupModal`) gets slow as the
artifact count grows. Scan time is roughly quadratic when many artifacts
share one set, slot, rarity, and main stat. Synthetic benchmark: 2,000
artifacts in one bucket take about 170 ms, 4,000 about 620 ms, 8,000 about
1.2 s. The goal is to make the scan close to linear without changing which
artifacts are reported as duplicates.

## Goals

- Same groups, same order, as the current `findDuplicateGroups` for any
  input.
- Remove the per-artifact scan over every candidate in the bucket for the
  common case (full 4-substat artifacts).
- Keep `findDups` in `ArtifactDataManager` as the only matching rule.

## Non-goals

- No SQLite or backend.
- No change to `findDups` itself, the `upgraded` result, or the import flow.
- No change to `DupModal` rendering or to its `useMemo` dependencies (the
  full recompute on every artifact edit is a known follow-up, not part of
  this change).

## Anti-goals

- Reporting a different set of duplicates, even for odd input (partial
  substats, equal values, duplicate keys).

## Constraints

- The group head is the first unclaimed artifact in input order, and its
  duplicates are claimed greedily.
- Duplicates require equal `level`, equal bucket key (`setKey`, `rarity`,
  `slotKey`, `mainStatKey`), and, given distinct substat keys per artifact,
  identical substats in the same positions. Empty slots must line up, and an
  empty slot's value is ignored. (The first draft said empty slots act as
  wildcards; `findDups`'s positional pre-filter rules that out.)

## Approaches

1. **Hash grouping (chosen).** Full heads look up an exact signature map.
   Partial heads fall back to a scan of the same `(bucket, level)` list.
   Keeps `findDups` as the final check.
2. Worker only. Moves the quadratic scan off the main thread but keeps it
   O(b²). Rejected: fixes the freeze, not the time.
3. SQLite index. Rejected: new persistence layer and migration for a
   problem that fits in memory.

## Design

- Group input artifacts by `(bucketKey, level)`, preserving input order.
- Build a signature for each artifact: its non-empty substats sorted by key,
  serialized as `key:value` pairs. Keep a `Map<signature, id[]>` per
  `(bucketKey, level)`, in input order.
- Visit artifacts in input order, as today. Skip claimed artifacts.
  - **Full head** (exactly 4 substats, all with a key): candidates are the
    unclaimed artifacts with the same signature. A full head can only match
    a candidate with an identical substat set, so this list is a superset of
    the true duplicates.
  - **Partial head** (any empty substat): candidates are all unclaimed
    artifacts in the same `(bucketKey, level)` list, as today.
  - In both cases, call `findDups(head, candidates)` and use its
    `duplicated` result. The database rules stay the final check.
- Claim duplicates and emit `[head, ...dupIds]` in the same order as today.

Known assumption: substat keys are unique within one artifact, as the game
guarantees. If a fast-path head has a non-unique substat key, the signature
check could miss a match that `findDups` would find. Tests cover this case
explicitly (see below).

## Revision (during implementation)

Working through `findDups` showed that, when substat keys are distinct
within an artifact, a duplicate has exactly the same substats in the same
positions as its head, partial artifacts included. So the build differs from
the design above:

- Every head uses the signature lookup, not only full ones. The signature is
  `setKey|rarity|slotKey|mainStatKey|level` plus each substat position as
  `key:value`, or empty for an empty slot.
- A head with a repeated substat key (the game never produces one) falls back
  to every unclaimed artifact with the same bucket and level.
- `findDups` is still the final check on every candidate list.

The test oracle added in commit `802ce088` had the wrong `duplicated`
predicate (it returned the upgrade set). It now mirrors production, and the
test that expected a lower-level copy to be grouped now expects `[]`.

Result on synthetic data with one shared bucket, same data for both:

| Artifacts | Before | After |
|---|---|---|
| 2,000 | 136 ms | 5 ms |
| 4,000 | 195 ms | 7 ms |
| 8,000 | 437 ms | 12 ms |

Group counts match. The earlier numbers in "Intent" came from data with
repeated substat keys, which the game never produces.

## Verification

- Keep the current pairwise implementation as a reference in the test file.
  Compare its output with the new one on randomized inputs: partial and full
  substats, equal and near values, shared buckets, and levels that collide.
  Output must match exactly, including group order.
- Keep existing `dupGroups.test.ts` tests passing.
- Re-run the synthetic benchmark on the single-bucket case (2k, 4k, 8k) and
  record before and after numbers.

## Left to the builder (my calls, unless you object)

- The signature format is `key:value` joined with `|`, after sorting by key.
- Values are compared with `===` semantics. NaN is treated as not equal, the
  same as today.
- The fast-path check is `substats.length === 4 && every key is set`.
- No public API change. `findDuplicateGroups` keeps its signature.

## Questions for you

None blocking. Reply "approved" to proceed to the implementation plan, or
tell me what to change in this doc.
