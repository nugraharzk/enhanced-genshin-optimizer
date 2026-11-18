import type { CharacterKey } from '@genshin-optimizer/gi/consts'

export type Verdict = 'keep' | 'maybe' | 'trash'

export interface TriageOwner {
  key: CharacterKey
  value: number
}

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
