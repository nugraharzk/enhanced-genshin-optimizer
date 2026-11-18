import type { CharacterKey } from '@genshin-optimizer/gi/consts'
import type { ICachedArtifact } from '@genshin-optimizer/gi/db'
import { getMainStatDisplayValue } from '@genshin-optimizer/gi/util'
import { MAYBE_THRESHOLD, SET_IDENTITY, verdictFor } from './constants'
import type {
  StatWeights,
  TriageOwner,
  TriageResult,
  WeightsByChar,
} from './types'

/** Percent damage the artifact's stats are worth for one character. */
export function scoreArtifact(
  artifact: ICachedArtifact,
  weights: StatWeights
): number {
  let score = 0
  for (const { key, accurateValue } of artifact.substats) {
    if (!key) continue
    score += accurateValue * (weights[key] ?? 0)
  }
  score +=
    getMainStatDisplayValue(
      artifact.mainStatKey,
      artifact.rarity,
      artifact.level
    ) * (weights[artifact.mainStatKey] ?? 0)
  return score
}

export function scoreAgainstRoster(
  artifact: ICachedArtifact,
  byChar: WeightsByChar
): { value: number; owners: TriageOwner[] } {
  let value = 0
  const owners: TriageOwner[] = []
  for (const [key, weights] of Object.entries(byChar)) {
    if (!weights) continue
    const score = scoreArtifact(artifact, weights)
    if (score > value) value = score
    if (score >= MAYBE_THRESHOLD)
      owners.push({ key: key as CharacterKey, value: score })
  }
  owners.sort((a, b) => b.value - a.value)
  return { value, owners: owners.slice(0, 3) }
}

/**
 * True when the piece is defined by its set rather than by anyone in the
 * roster: Husk + DEF%, Emblem + ER%, an EM set with EM, and so on.
 */
function matchesSetIdentity(artifact: ICachedArtifact): boolean {
  const identity = SET_IDENTITY[artifact.setKey]
  if (!identity?.length) return false
  if (identity.includes(artifact.mainStatKey)) return true
  // Substats are lines, not rolled counts; four matching lines is the
  // strongest signal an artifact can carry without a roll breakdown.
  return (
    artifact.substats.filter(
      ({ key }) => !!key && identity.includes(key)
    ).length >= 4
  )
}

export function triageArtifact(
  artifact: ICachedArtifact,
  byChar: WeightsByChar
): TriageResult {
  const { value, owners } = scoreAgainstRoster(artifact, byChar)
  const future = owners.length === 0 && matchesSetIdentity(artifact)

  let verdict = verdictFor(value)
  if (future) verdict = 'maybe'
  if (artifact.location) verdict = 'keep'

  return { verdict, value, owners, future, locked: !!artifact.lock }
}
