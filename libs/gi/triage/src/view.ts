import type { TriageResult, Verdict } from './types'

export type VerdictFilter = 'all' | Verdict

/**
 * The triage view: keep only scored artifacts that match the verdict filter,
 * highest value first. Pure so it can be tested without React.
 */
export function applyTriageView(
  ids: readonly string[],
  results: ReadonlyMap<string, TriageResult>,
  filter: VerdictFilter
): string[] {
  const out: string[] = []
  for (const id of ids) {
    const result = results.get(id)
    if (!result) continue
    if (filter !== 'all' && result.verdict !== filter) continue
    out.push(id)
  }
  return out.sort(
    (a, b) => (results.get(b)?.value ?? 0) - (results.get(a)?.value ?? 0)
  )
}
