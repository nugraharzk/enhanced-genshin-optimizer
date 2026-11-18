import type { ICachedArtifact } from '@genshin-optimizer/gi/db'
import type { StatWeights, WeightsByChar } from './types'
import { scoreArtifact, triageArtifact } from './score'

const weights: StatWeights = { critRate_: 2, atk_: 0.5, pyro_dmg_: 1 }

const artifact = {
  id: 'a',
  setKey: 'CrimsonWitchOfFlames',
  slotKey: 'goblet',
  rarity: 5,
  level: 20,
  mainStatKey: 'pyro_dmg_',
  substats: [
    { key: 'critRate_', accurateValue: 7 },
    { key: 'atk_', accurateValue: 10 },
    { key: '', accurateValue: 0 },
  ],
  location: '',
  lock: false,
} as unknown as ICachedArtifact

describe('scoreArtifact', () => {
  it('sums substats and mainstat in percent damage', () => {
    // 7*2 + 10*0.5 + 46.6*1
    expect(scoreArtifact(artifact, weights)).toBeCloseTo(65.6)
  })

  it('lets a hidden substat line through without throwing', () => {
    expect(() =>
      scoreArtifact(
        { ...artifact, substats: [{ key: '', accurateValue: 0 }] } as ICachedArtifact,
        weights
      )
    ).not.toThrow()
  })

  it('scores a four-star artifact without throwing', () => {
    expect(() =>
      scoreArtifact({ ...artifact, rarity: 4 } as ICachedArtifact, weights)
    ).not.toThrow()
  })
})

describe('triageArtifact', () => {
  const byChar = { Albedo: { atk_: 1 } } as WeightsByChar

  it('forces equipped artifacts to keep', () => {
    expect(
      triageArtifact({ ...artifact, location: 'Albedo' } as ICachedArtifact, byChar)
        .verdict
    ).toEqual('keep')
  })

  it('leaves locked artifacts with their computed verdict', () => {
    const weak = {
      ...artifact,
      substats: [{ key: 'atk_', accurateValue: 1 }],
    } as ICachedArtifact
    expect(triageArtifact({ ...weak, lock: true }, byChar)).toMatchObject({
      locked: true,
      verdict: 'trash',
    })
  })

  it('lifts an unowned identity piece to maybe/future', () => {
    const husk = {
      ...artifact,
      setKey: 'HuskOfOpulentDreams',
      slotKey: 'sands',
      mainStatKey: 'def_',
      substats: [],
      location: '',
      lock: false,
    } as ICachedArtifact
    expect(triageArtifact(husk, byChar)).toMatchObject({
      verdict: 'maybe',
      future: true,
    })
  })

  it('trashes an unowned piece that is not set-identity', () => {
    const weak = {
      ...artifact,
      substats: [{ key: 'atk_', accurateValue: 1 }],
    } as ICachedArtifact
    expect(triageArtifact(weak, byChar)).toMatchObject({
      verdict: 'trash',
      future: false,
    })
  })
})
