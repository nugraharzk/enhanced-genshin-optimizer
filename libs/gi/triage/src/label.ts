import type { TriageResult, Verdict } from './types'

const VERDICT_LABEL: Record<Verdict, string> = {
  keep: 'KEEP',
  maybe: 'MAYBE',
  trash: 'TRASH',
}

/** Short card label: `KEEP 27% · AratakiItto, Noelle`. */
export function triageLabel(result: TriageResult): string {
  const head = VERDICT_LABEL[result.verdict]
  const value = result.owners.length ? ` ${Math.round(result.value)}%` : ''
  const tail = result.future
    ? ' · future'
    : result.owners.length
      ? ` · ${result.owners.map((owner) => owner.key).join(', ')}`
      : ''
  return `${head}${value}${tail}`
}
