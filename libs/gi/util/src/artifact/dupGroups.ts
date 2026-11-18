/**
 * Only artifacts with the same set, rarity, slot, main stat and level can be
 * duplicates, so they are grouped first. Within a group, duplicates must also
 * have identical substats in the same positions, so they are looked up by an
 * exact signature instead of being compared pairwise. At ~4000 artifacts this
 * keeps the scan close to linear.
 */
export type DupArtifact = {
  id: string
  setKey: string
  rarity: number
  slotKey: string
  mainStatKey: string
  level: number
  substats: readonly { key: string; value: number }[]
}

function push(map: Map<string, string[]>, key: string, id: string) {
  const list = map.get(key)
  if (list) list.push(id)
  else map.set(key, [id])
}

/**
 * Groups artifacts that `findDups` reports as duplicates of an earlier
 * artifact, preserving the visit order and greedy claiming of the original
 * `DupContent` loop: the first artifact of a group is kept, its duplicates are
 * claimed and never considered again.
 *
 * `findDups` is injected so the database's matching rules stay the single
 * source of truth. This function only decides which candidates are passed to
 * it. The candidates are a superset of the true duplicates, so the result is
 * the same as scanning every artifact in the group.
 */
export function findDuplicateGroups<T extends DupArtifact>(
  arts: readonly T[],
  findDups: (art: T, ids: string[]) => { duplicated: T[] }
): string[][] {
  const groupKey = (a: DupArtifact) =>
    `${a.setKey}|${a.rarity}|${a.slotKey}|${a.mainStatKey}|${a.level}`
  // Empty slots compare as empty, and their values are ignored.
  const signatureKey = (a: DupArtifact) =>
    `${groupKey(a)}#${a.substats.map((s) => (s.key ? `${s.key}:${s.value}` : '')).join('|')}`
  // The signature relies on each substat key appearing at most once per
  // artifact, as the game guarantees. Artifacts that break that rule fall back
  // to the whole group.
  const hasRepeatedKey = (a: DupArtifact) => {
    const keys = a.substats.filter((s) => s.key).map((s) => s.key)
    return new Set(keys).size !== keys.length
  }

  const byGroup = new Map<string, string[]>()
  const bySignature = new Map<string, string[]>()
  for (const art of arts) {
    push(byGroup, groupKey(art), art.id)
    push(bySignature, signatureKey(art), art.id)
  }

  const remaining = new Set(arts.map((a) => a.id))
  const groups: string[][] = []
  for (const art of arts) {
    if (!remaining.delete(art.id)) continue
    const pool = hasRepeatedKey(art)
      ? byGroup.get(groupKey(art))
      : bySignature.get(signatureKey(art))
    if (!pool || pool.length < 2) continue

    const candidates = pool.filter((id) => remaining.has(id))
    if (!candidates.length) continue
    const { duplicated } = findDups(art, candidates)
    if (!duplicated.length) continue

    const dupIds = duplicated.map((a) => a.id)
    groups.push([art.id, ...dupIds])
    for (const id of dupIds) remaining.delete(id)
  }
  return groups
}
