import type { CharacterKey } from '@genshin-optimizer/gi/consts'
import type { ArtCharDatabase, ICachedArtifact } from '@genshin-optimizer/gi/db'
import { scoreArtifact } from './score'
import type { StatWeights } from './types'
import { computeStatWeights } from './weights'

/** Percent damage the equipped pieces are worth, in total. */
export function scoreBuild(
  artifacts: readonly ICachedArtifact[],
  weights: StatWeights
): number {
  return artifacts.reduce((sum, artifact) => sum + scoreArtifact(artifact, weights), 0)
}

/**
 * Build score for one character: undefined when nothing is equipped or the
 * character has no usable damage target.
 */
export function computeBuildScore(
  database: ArtCharDatabase,
  charKey: CharacterKey
): number | undefined {
  const character = database.chars.get(charKey)
  if (!character) return undefined
  const artifacts = Object.values(character.equippedArtifacts)
    .filter(Boolean)
    .map((id) => database.arts.get(id))
    .filter((artifact): artifact is ICachedArtifact => !!artifact)
  if (!artifacts.length) return undefined

  const weights = computeStatWeights(database, charKey)
  if (!weights) return undefined
  return scoreBuild(artifacts, weights)
}
