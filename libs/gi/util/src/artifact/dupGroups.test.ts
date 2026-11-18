import type {
  ArtifactRarity,
  ArtifactSetKey,
  ArtifactSlotKey,
  MainStatKey,
  SubstatKey,
} from '@genshin-optimizer/gi/consts'
import { type DupArtifact, findDuplicateGroups } from './dupGroups'

type Art = DupArtifact & {
  setKey: ArtifactSetKey
  rarity: ArtifactRarity
  slotKey: ArtifactSlotKey
  mainStatKey: MainStatKey
  substats: { key: SubstatKey | ''; value: number }[]
}

/**
 * Mirrors ArtifactDataManager.findDups. Copied here so the grouping test does
 * not depend on the database, while still exercising the real matching rules.
 */
function findDups(editor: Art, ids: string[], byId: Map<string, Art>) {
  const { setKey, rarity, level, slotKey, mainStatKey, substats } = editor
  const candidates = ids
    .map((id) => byId.get(id))
    .filter((c): c is Art => !!c)
    .filter(
      (c) =>
        setKey === c.setKey &&
        rarity === c.rarity &&
        slotKey === c.slotKey &&
        mainStatKey === c.mainStatKey &&
        level >= c.level &&
        substats.every(
          (s, i) =>
            !c.substats[i]?.key ||
            (s.key === c.substats[i].key && s.value >= c.substats[i].value)
        )
    )
  const duplicated = candidates.filter(
    (c) =>
      level === c.level &&
      substats.every(
        (s) =>
          !s.key ||
          c.substats.some((cs) => s.key === cs.key && s.value === cs.value)
      )
  )
  return { duplicated }
}

/** The original DupContent loop, kept as the behavioural reference. */
function reference(arts: Art[], byId: Map<string, Art>) {
  let keys = arts.map((a) => a.id)
  const groups: string[][] = []
  while (keys.length) {
    const id = keys.shift()!
    const art = byId.get(id)
    if (!art) continue
    const { duplicated } = findDups(art, keys, byId)
    if (!duplicated.length) continue
    const dupIds = duplicated.map((a) => a.id)
    groups.push([id, ...dupIds])
    keys = keys.filter((x) => !dupIds.includes(x))
  }
  return groups
}

function art(overrides: Partial<Art> & { id: string }): Art {
  return {
    setKey: 'GladiatorsFinale',
    rarity: 5,
    level: 20,
    slotKey: 'goblet',
    mainStatKey: 'geo_dmg_',
    substats: [
      { key: 'critRate_', value: 3.1 },
      { key: 'critDMG_', value: 6.2 },
      { key: 'atk_', value: 4.7 },
      { key: 'enerRech_', value: 5.2 },
    ],
    ...overrides,
  }
}

function run(arts: Art[]) {
  const byId = new Map(arts.map((a) => [a.id, a]))
  return findDuplicateGroups(arts, (a, ids) => findDups(a, ids, byId))
}

/** Small deterministic PRNG so the randomized case is reproducible. */
function makeRng(seed: number) {
  let s = seed
  return () => {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff
    return s / 0x80000000
  }
}

describe('findDuplicateGroups', () => {
  it('does not group a lower-level copy (that is an upgrade, not a duplicate)', () => {
    const arts = [art({ id: 'a', level: 20 }), art({ id: 'b', level: 16 })]
    expect(run(arts)).toEqual([])
  })

  it('never groups across slot, rarity, set or main stat', () => {
    const arts = [
      art({ id: 'a' }),
      art({ id: 'b', slotKey: 'sands', mainStatKey: 'geo_dmg_' }),
      art({ id: 'c', rarity: 4 }),
      art({ id: 'd', setKey: 'Berserker' }),
      art({ id: 'e', mainStatKey: 'atk_' }),
    ]
    expect(run(arts)).toEqual([])
  })

  it('does not reuse a copy that was already claimed', () => {
    const x = [
      { key: 'critRate_', value: 9 },
      { key: 'critDMG_', value: 6 },
      { key: 'atk_', value: 5 },
      { key: 'enerRech_', value: 5 },
    ] as const
    const y = [
      { key: 'critRate_', value: 3 },
      { key: 'critDMG_', value: 6 },
      { key: 'atk_', value: 5 },
      { key: 'enerRech_', value: 5 },
    ] as const
    const arts = [
      art({ id: 'a', substats: [...x] }),
      art({ id: 'b', substats: [...x] }),
      art({ id: 'c', substats: [...y] }),
      art({ id: 'd', substats: [...y] }),
    ]
    expect(run(arts)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })

  it('does not group a partial artifact with a full copy', () => {
    const arts = [
      art({
        id: 'a',
        substats: [
          { key: 'critRate_', value: 3.1 },
          { key: 'critDMG_', value: 6.2 },
          { key: '', value: 0 },
          { key: '', value: 0 },
        ],
      }),
      art({ id: 'b' }),
    ]
    expect(run(arts)).toEqual([])
  })

  it('groups partial copies with identical empty slots', () => {
    const partial = [
      { key: 'critRate_', value: 3.1 },
      { key: 'critDMG_', value: 6.2 },
      { key: '', value: 0 },
      { key: '', value: 0 },
    ] as const
    const arts = [
      art({ id: 'a', substats: [...partial] }),
      art({ id: 'b', substats: [...partial] }),
    ]
    expect(run(arts)).toEqual([['a', 'b']])
  })

  it('ignores the value of an empty substat slot', () => {
    const arts = [
      art({
        id: 'a',
        substats: [
          { key: 'critRate_', value: 3.1 },
          { key: '', value: 9 },
          { key: '', value: 0 },
          { key: '', value: 0 },
        ],
      }),
      art({
        id: 'b',
        substats: [
          { key: 'critRate_', value: 3.1 },
          { key: '', value: 0 },
          { key: '', value: 0 },
          { key: '', value: 0 },
        ],
      }),
    ]
    expect(run(arts)).toEqual([['a', 'b']])
  })

  it('still groups artifacts that repeat a substat key', () => {
    const repeated = [
      { key: 'atk_', value: 1 },
      { key: 'atk_', value: 1 },
      { key: '', value: 0 },
      { key: '', value: 0 },
    ] as const
    const arts = [
      art({ id: 'a', substats: [...repeated] }),
      art({ id: 'b', substats: [...repeated] }),
    ]
    expect(run(arts)).toEqual(
      reference(arts, new Map(arts.map((a) => [a.id, a])))
    )
    expect(run(arts)).toEqual([['a', 'b']])
  })

  it('matches the original loop on a randomized collection', () => {
    const rnd = makeRng(12345)
    const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]
    const sets: ArtifactSetKey[] = ['GladiatorsFinale', 'Berserker']
    const slots: ArtifactSlotKey[] = ['goblet', 'flower']
    const mains: MainStatKey[] = ['geo_dmg_', 'atk_']
    const subKeys: SubstatKey[] = [
      'critRate_',
      'critDMG_',
      'atk_',
      'enerRech_',
      'hp_',
    ]
    const arts: Art[] = []
    for (let i = 0; i < 1000; i++) {
      // Mostly the same key order so exact duplicates occur; keys stay distinct
      // within one artifact, as the game guarantees.
      const keys =
        rnd() < 0.8
          ? subKeys.slice(0, 4)
          : [...subKeys].sort(() => rnd() - 0.5).slice(0, 4)
      arts.push(
        art({
          id: `art_${i}`,
          setKey: pick(sets),
          rarity: pick([4, 5] as ArtifactRarity[]),
          slotKey: pick(slots),
          mainStatKey: pick(mains),
          level: pick([0, 4, 8, 12, 16, 20]),
          substats: keys.map((key) =>
            rnd() < 0.3
              ? { key: '' as const, value: 0 }
              : { key, value: Math.floor(rnd() * 3) }
          ),
        })
      )
    }
    const byId = new Map(arts.map((a) => [a.id, a]))
    const expected = reference(arts, byId)
    expect(expected.length).toBeGreaterThan(0)
    expect(run(arts)).toEqual(expected)
  })
})
