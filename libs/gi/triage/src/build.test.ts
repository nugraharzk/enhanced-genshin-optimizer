import { createTestDBStorage } from '@genshin-optimizer/common/database'
import { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import type { ICachedArtifact } from '@genshin-optimizer/gi/db'
import { computeBuildScore, scoreBuild } from './build'
import { scoreArtifact } from './score'
import type { StatWeights } from './types'

const weights: StatWeights = { critRate_: 2, atk_: 0.5 }

const flower = {
  id: 'a',
  setKey: 'GladiatorsFinale',
  slotKey: 'flower',
  rarity: 5,
  level: 20,
  mainStatKey: 'hp',
  substats: [
    { key: 'critRate_', accurateValue: 7 },
    { key: 'atk_', accurateValue: 10 },
  ],
  location: '',
  lock: false,
} as unknown as ICachedArtifact

describe('scoreBuild', () => {
  it('sums the score of every equipped piece', () => {
    const sands = {
      ...flower,
      id: 'b',
      slotKey: 'sands',
      mainStatKey: 'atk_',
      substats: [{ key: 'critRate_', accurateValue: 3.5 }],
    } as ICachedArtifact
    expect(scoreBuild([flower, sands], weights)).toBeCloseTo(
      scoreArtifact(flower, weights) + scoreArtifact(sands, weights)
    )
  })

  it('is zero with no pieces', () => {
    expect(scoreBuild([], weights)).toEqual(0)
  })
})

describe('computeBuildScore', () => {
  it('scores the artifacts a character has equipped', () => {
    const database = new ArtCharDatabase(1, createTestDBStorage('go'))
    database.chars.set('Albedo', {
      key: 'Albedo',
      level: 90,
      ascension: 6,
      constellation: 0,
      talent: { auto: 10, skill: 10, burst: 10 },
    })
    database.arts.set('flower', { ...flower, id: 'flower', location: 'Albedo' })
    const score = computeBuildScore(database, 'Albedo')!
    expect(score).toBeGreaterThan(0)
  })

  it('returns undefined when nothing is equipped', () => {
    const database = new ArtCharDatabase(1, createTestDBStorage('go'))
    database.chars.set('Albedo', {
      key: 'Albedo',
      level: 90,
      ascension: 6,
      constellation: 0,
      talent: { auto: 10, skill: 10, burst: 10 },
    })
    expect(computeBuildScore(database, 'Albedo')).toBeUndefined()
  })
})
