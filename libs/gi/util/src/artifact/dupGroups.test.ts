import type { ArtifactRarity, ArtifactSetKey, ArtifactSlotKey, MainStatKey, SubstatKey } from '@genshin-optimizer/gi/consts'
import { findDuplicateGroups, type DupArtifact } from './dupGroups'

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
      !(
        level === c.level &&
        substats.every(
          (s, i) => s.key === c.substats[i]?.key && s.value === c.substats[i]?.value
        )
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

describe('findDuplicateGroups', () => {
  it('groups a lower-level copy with its better original', () => {
    const arts = [
      art({ id: 'a', level: 20 }),
      art({ id: 'b', level: 16 }),
      art({ id: 'c', level: 20, mainStatKey: 'atk_' }),
    ]
    expect(run(arts)).toEqual([['a', 'b']])
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
    const arts = [
      art({ id: 'a', level: 20, substats: [{ key: 'critRate_', value: 9 }, { key: 'critDMG_', value: 6 }, { key: 'atk_', value: 5 }, { key: 'enerRech_', value: 5 }] }),
      art({ id: 'b', level: 16, substats: [{ key: 'critRate_', value: 5 }, { key: 'critDMG_', value: 6 }, { key: 'atk_', value: 5 }, { key: 'enerRech_', value: 5 }] }),
      art({ id: 'c', level: 12, substats: [{ key: 'critRate_', value: 3 }, { key: 'critDMG_', value: 6 }, { key: 'atk_', value: 5 }, { key: 'enerRech_', value: 5 }] }),
    ]
    expect(run(arts)).toEqual([['a', 'b', 'c']])
  })

  it('matches the original loop on a randomized collection', () => {
    const sets: ArtifactSetKey[] = ['GladiatorsFinale', 'Berserker', 'EmblemOfSeveredFate']
    const subs: SubstatKey[] = ['critRate_', 'critDMG_', 'atk_', 'enerRech_']
    const arts: Art[] = []
    for (let i = 0; i < 300; i++) {
      const level = [0, 4, 8, 12, 16, 20][i % 6]
      arts.push(
        art({
          id: `art_${i}`,
          setKey: sets[i % 3],
          level,
          substats: subs.map((key, j) => ({ key, value: ((i * 7 + j * 13) % 10) + 1 })),
        })
      )
    }
    const byId = new Map(arts.map((a) => [a.id, a]))
    expect(run(arts)).toEqual(reference(arts, byId))
  })
})
