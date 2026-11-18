import { createTestDBStorage } from '@genshin-optimizer/common/database'
import { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import { statBump } from './reference'
import { computeStatWeights } from './weights'

function makeDatabase() {
  const database = new ArtCharDatabase(1, createTestDBStorage('go'))
  database.chars.set('Albedo', {
    key: 'Albedo',
    level: 90,
    ascension: 6,
    constellation: 0,
    talent: { auto: 10, skill: 10, burst: 10 },
  })
  return database
}

describe('computeStatWeights', () => {
  let database: ArtCharDatabase
  beforeEach(() => {
    database = makeDatabase()
  })

  it('weights the stat the kit scales with above the one it does not', () => {
    const w = computeStatWeights(database, 'Albedo')!
    expect(w.def_).toBeGreaterThan(w.atk_)
    expect(w.hp_).toBeLessThan(0.01)
  })

  it('keeps crit rate and crit damage comparable', () => {
    const w = computeStatWeights(database, 'Albedo')!
    // Weights are per display unit and a CD roll is ~2.2x the size of a CR
    // roll, so compare one max roll of each.
    const crRoll = w.critRate_ * statBump('critRate_').display
    const cdRoll = w.critDMG_ * statBump('critDMG_').display
    expect(crRoll / cdRoll).toBeGreaterThan(0.5)
    expect(crRoll / cdRoll).toBeLessThan(2)
  })

  it('returns weights for a character with no loadout', () => {
    expect(computeStatWeights(database, 'Albedo')).toBeDefined()
  })

  it('scores an off-element DMG goblet at zero', () => {
    const w = computeStatWeights(database, 'Albedo')! // geo
    expect(w.pyro_dmg_).toEqual(0)
  })
})
