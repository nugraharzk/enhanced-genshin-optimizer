import type {
  ArtifactSetKey,
  CharacterKey,
  SubstatKey,
} from '@genshin-optimizer/gi/consts'
import type { Verdict } from './types'

export const KEEP_THRESHOLD = 12
export const MAYBE_THRESHOLD = 6
export const WEIGHTS_VERSION = 1

export function verdictFor(value: number): Verdict {
  if (value >= KEEP_THRESHOLD) return 'keep'
  if (value >= MAYBE_THRESHOLD) return 'maybe'
  return 'trash'
}

/**
 * Sets whose identity is a stat other than damage, so a piece of that set is
 * worth keeping even when nobody in the roster is weighted for it yet.
 */
export const SET_IDENTITY: Partial<Record<ArtifactSetKey, SubstatKey[]>> = {}

/** Characters whose rotation depends on energy, with ER weight per unit. */
export const ER_NEED: Partial<Record<CharacterKey, number>> = {}

/** Healers and shielders whose kit scales on a stat damage does not read. */
export const HEAL_SHIELD_SCALING: Partial<Record<CharacterKey, SubstatKey[]>> =
  {}
