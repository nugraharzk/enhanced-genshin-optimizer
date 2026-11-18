/**
 * Pairs of artifacts only ever match when these four fields are equal, so
 * bucketing by them first turns the O(n²) duplicate scan into a scan of small
 * buckets. At ~4000 artifacts this is the difference between a ~400ms main
 * thread stall and a few milliseconds.
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

/**
 * Groups artifacts that `findDups` reports as duplicates of an earlier
 * artifact, preserving the visit order and greedy claiming of the original
 * `DupContent` loop: the first artifact of a group is kept, its duplicates are
 * claimed and never considered again.
 *
 * `findDups` is injected so the database's matching rules stay the single
 * source of truth.
 */
export function findDuplicateGroups<T extends DupArtifact>(
  arts: readonly T[],
  findDups: (art: T, ids: string[]) => { duplicated: T[] }
): string[][] {
  const bucketKey = (a: DupArtifact) =>
    `${a.setKey}|${a.rarity}|${a.slotKey}|${a.mainStatKey}`

  const buckets = new Map<string, string[]>()
  for (const art of arts) {
    const key = bucketKey(art)
    const bucket = buckets.get(key)
    if (bucket) bucket.push(art.id)
    else buckets.set(key, [art.id])
  }

  const remaining = new Set(arts.map((a) => a.id))
  const groups: string[][] = []
  for (const art of arts) {
    if (!remaining.delete(art.id)) continue
    const bucket = buckets.get(bucketKey(art))
    if (!bucket || bucket.length < 2) continue

    const candidates = bucket.filter((id) => remaining.has(id))
    const { duplicated } = findDups(art, candidates)
    if (!duplicated.length) continue

    const dupIds = duplicated.map((a) => a.id)
    groups.push([art.id, ...dupIds])
    for (const id of dupIds) remaining.delete(id)
  }
  return groups
}
