import { activeFilterCount } from '@genshin-optimizer/gi/ui'
import { WEAPON_FILTER_DEFAULTS } from '../../../../../libs/gi/page-weapons/src/WeaponFilter'

describe('weapon filter defaults', () => {
  it('inventory defaults are visible: showEquipped/showInventory true, locations empty', () => {
    expect(WEAPON_FILTER_DEFAULTS.showEquipped).toBe(true)
    expect(WEAPON_FILTER_DEFAULTS.showInventory).toBe(true)
    expect(WEAPON_FILTER_DEFAULTS.locations).toEqual([])
    expect(WEAPON_FILTER_DEFAULTS.locked).toEqual(['locked', 'unlocked'])
  })

  it('a fresh display state counts as no active filters', () => {
    expect(activeFilterCount(WEAPON_FILTER_DEFAULTS, WEAPON_FILTER_DEFAULTS)).toBe(0)
    expect(
      activeFilterCount(WEAPON_FILTER_DEFAULTS, {
        ...WEAPON_FILTER_DEFAULTS,
        rarity: [5],
      })
    ).toBe(1)
  })
})
