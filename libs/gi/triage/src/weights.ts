import {
  allMainStatKeys,
  allSubstatKeys,
} from '@genshin-optimizer/gi/consts'
import type { CharacterKey } from '@genshin-optimizer/gi/consts'
import type { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import { uiDataForTeam } from '@genshin-optimizer/gi/uidata'
import type { Data, NumNode } from '@genshin-optimizer/gi/wr'
import { dynamicData, mergeData, optimize, precompute } from '@genshin-optimizer/gi/wr'
import { ER_NEED, HEAL_SHIELD_SCALING } from './constants'
import {
  buildReferenceData,
  elementOf,
  findLoadoutTarget,
  referenceStats,
  statBump,
} from './reference'
import type { StatWeights, WeightsByChar } from './types'

const WEIGHTED_KEYS = [...new Set<string>([...allSubstatKeys, ...allMainStatKeys])]

/** Display groups that hold damage output; everything else is stats or state. */
const MOVE_GROUPS = ['normal', 'charged', 'plunging', 'skill', 'burst', 'custom']

type Candidate = { path: string[]; node: NumNode }

function collectCandidates(
  group: Record<string, unknown> | undefined,
  path: string[],
  out: Candidate[]
): void {
  if (!group) return
  for (const [key, value] of Object.entries(group)) {
    if (!value || typeof value !== 'object') continue
    const node = value as NumNode
    if (typeof (node as { operation?: unknown }).operation === 'string') {
      out.push({ path: [...path, key], node })
      continue
    }
    collectCandidates(value as Record<string, unknown>, [...path, key], out)
  }
}

function candidatesOf(data: Data): Candidate[] {
  const out: Candidate[] = []
  const display = (data.display ?? {}) as Record<string, Record<string, unknown>>
  for (const group of MOVE_GROUPS) collectCandidates(display[group], [group], out)
  return out
}

/**
 * Relative damage gain in percent per display unit of each stat, for one
 * character at the reference build.
 */
export function computeStatWeights(
  database: ArtCharDatabase,
  charKey: CharacterKey
): StatWeights | undefined {
  const data = buildReferenceData(database, charKey)
  if (!data) return undefined

  const ui = uiDataForTeam({ [charKey]: data }, database.gender, charKey)[charKey]
    ?.target
  const root = ui?.data[0]
  if (!root) return undefined
  // Mark artifact fields as dynamic, so a stat line is an evaluation input
  // instead of a constant folded away (same trick as TabOptimize).
  const workerData = mergeData([root, dynamicData])

  const candidates = candidatesOf(workerData)
  if (!candidates.length) return undefined

  // Compile every candidate once; each stat line is then a cheap function call.
  const nodes = optimize(
    candidates.map((c) => c.node),
    workerData,
    ({ path: [p] }) => p !== 'dyn'
  )
  const evaluate = precompute(nodes, {}, (f) => f.path[1], 1)
  const at = (stats: Record<string, number>) => evaluate([{ values: stats }])

  const stats = referenceStats(elementOf(charKey))
  const base = at(stats)

  const configuredTarget = findLoadoutTarget(database, charKey)
  const configuredIndex = configuredTarget
    ? candidates.findIndex(
        (c) => c.path.join('.') === configuredTarget.join('.')
      )
    : -1
  let bestIndex = -1
  let bestValue = 0
  base.forEach((value, index) => {
    if (!Number.isFinite(value) || value <= bestValue) return
    bestValue = value
    bestIndex = index
  })
  if (configuredIndex >= 0 && Number.isFinite(base[configuredIndex])) {
    bestIndex = configuredIndex
    bestValue = base[configuredIndex]
  }
  // Normal-attack entries need a build's hit index and fold to NaN without one.
  if (bestIndex < 0 || bestValue <= 0) return undefined

  const weights: StatWeights = {}
  for (const key of WEIGHTED_KEYS) {
    const { internal, display } = statBump(key)
    const bumped = at({
      ...stats,
      [key]: (stats[key] ?? 0) + internal,
    })[bestIndex]
    weights[key] = (100 * (bumped - bestValue)) / bestValue / display
  }

  const erWeight = ER_NEED[charKey]
  if (erWeight !== undefined) weights['enerRech_'] = erWeight

  const utilityKeys = HEAL_SHIELD_SCALING[charKey]
  if (utilityKeys?.length) {
    const best = Math.max(...allSubstatKeys.map((key) => weights[key] ?? 0))
    for (const key of utilityKeys)
      weights[key] = Math.max(weights[key] ?? 0, best)
  }

  return weights
}

export async function computeRosterWeights(
  database: ArtCharDatabase,
  charKeys: CharacterKey[],
  onProgress?: (done: number, total: number) => void
): Promise<WeightsByChar> {
  const byChar: WeightsByChar = {}
  for (let i = 0; i < charKeys.length; i++) {
    const weights = computeStatWeights(database, charKeys[i])
    if (weights) byChar[charKeys[i]] = weights
    onProgress?.(i + 1, charKeys.length)
    // Keep the page responsive; one character per frame is plenty.
    if (i % 8 === 7) await new Promise((resolve) => setTimeout(resolve, 0))
  }
  return byChar
}
