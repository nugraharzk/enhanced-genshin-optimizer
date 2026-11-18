import type { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import { WEIGHTS_VERSION } from './constants'
import { triageArtifact } from './score'
import type { TriageResult, WeightsByChar } from './types'
import { computeRosterWeights } from './weights'

/**
 * Everything the weights depend on: the roster's stat-relevant fields and the
 * weapons they wear. Artifacts are deliberately absent — the reference build
 * is gear-free.
 */
export function rosterCacheKey(database: ArtCharDatabase): string {
  const chars = database.chars.values
    .map(
      (c) =>
        `${c.key}:${c.level}:${c.ascension}:${c.constellation}:${c.talent.auto}/${c.talent.skill}/${c.talent.burst}:${c.equippedWeapon}`
    )
    .sort()
  const weapons = database.weapons.values
    .map((w) => `${w.key}:${w.level}:${w.ascension}:${w.refinement}`)
    .sort()
  return `${WEIGHTS_VERSION}|${chars.join(',')}|${weapons.join(',')}`
}

const weightCache = new Map<string, WeightsByChar>()

export async function computeTriage(
  database: ArtCharDatabase,
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, TriageResult>> {
  const roster = database.chars.values.map((c) => c.key)
  const cacheKey = rosterCacheKey(database)
  let byChar = weightCache.get(cacheKey)
  if (!byChar) {
    byChar = await computeRosterWeights(database, roster, onProgress)
    weightCache.clear()
    weightCache.set(cacheKey, byChar)
  } else onProgress?.(roster.length, roster.length)

  const results = new Map<string, TriageResult>()
  for (const artifact of database.arts.values)
    results.set(artifact.id, triageArtifact(artifact, byChar))
  return results
}
