import { createTestDBStorage } from '@genshin-optimizer/common/database'
import type { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import { ArtCharDatabase as Db } from '@genshin-optimizer/gi/db'
import { computeTriage, rosterCacheKey } from './compute'

const flower = {
  setKey: 'GladiatorsFinale',
  rarity: 5,
  level: 20,
  slotKey: 'flower',
  mainStatKey: 'hp',
  substats: [
    { key: 'critRate_', value: 7, initialValue: 3.1 },
    { key: 'critDMG_', value: 14, initialValue: 6.2 },
    { key: 'atk_', value: 9, initialValue: 4.7 },
    { key: 'enerRech_', value: 10, initialValue: 5.2 },
  ],
  location: '',
  lock: false,
} as const

function makeDatabase(withChar: boolean) {
  const database: ArtCharDatabase = new Db(1, createTestDBStorage('go'))
  if (withChar)
    database.chars.set('Albedo', {
      key: 'Albedo',
      level: 90,
      ascension: 6,
      constellation: 0,
      talent: { auto: 10, skill: 10, burst: 10 },
    })
  return database
}

describe('computeTriage', () => {
  it('returns an empty map for an empty database', async () => {
    expect(await computeTriage(makeDatabase(false))).toEqual(new Map())
  })

  it('scores every artifact owned by the database', async () => {
    const database = makeDatabase(true)
    database.arts.set('a', { ...flower })
    database.arts.set('b', { ...flower, slotKey: 'plume', mainStatKey: 'atk' })
    const results = await computeTriage(database)
    expect(results.size).toEqual(database.arts.values.length)
    expect(
      [...results.values()].every((r) =>
        ['keep', 'maybe', 'trash'].includes(r.verdict)
      )
    ).toBe(true)
  })

  it('reports progress per character', async () => {
    const seen: number[] = []
    await computeTriage(makeDatabase(true), (done) => seen.push(done))
    expect(seen.at(-1)).toEqual(1)
  })
})

describe('rosterCacheKey', () => {
  it('changes when a character or their gear changes', () => {
    const database = makeDatabase(true)
    const before = rosterCacheKey(database)
    expect(rosterCacheKey(database)).toEqual(before)
    database.chars.set('Albedo', { level: 80, ascension: 6 })
    expect(rosterCacheKey(database)).not.toEqual(before)
  })
})
