import { allElementWithPhyKeys, allSubstatKeys } from '@genshin-optimizer/gi/consts'
import type {
  CharacterKey,
  ElementWithPhyKey,
  SubstatKey,
} from '@genshin-optimizer/gi/consts'
import type {
  ArtCharDatabase,
  ICachedWeapon,
  TeamCharacter,
} from '@genshin-optimizer/gi/db'
import { defaultInitialWeapon } from '@genshin-optimizer/gi/db'
import {
  allArtifactData,
  displayDataMap,
  getCharSheet,
  getWeaponSheet,
  reactionData,
  resonanceData,
} from '@genshin-optimizer/gi/sheets'
import { allStats, getCharStat } from '@genshin-optimizer/gi/stats'
import { getSubstatValue } from '@genshin-optimizer/gi/util'
import type { CharInfo, Data } from '@genshin-optimizer/gi/wr'
import {
  common,
  dataObjForCharacterNew,
  dataObjForWeapon,
  mergeData,
} from '@genshin-optimizer/gi/wr'

/**
 * Fixed stat budget the weights are measured on, in internal units (percent
 * stats are fractions). Without it a naked level-90 sheet has 50% crit damage
 * and one CD roll would be worth a tenth of a CR roll, so every CD piece would
 * read as trash.
 */
export const REFERENCE_STATS: Readonly<Record<string, number>> = {
  atk_: 1,
  critRate_: 0.6,
  critDMG_: 1.2,
  enerRech_: 1,
  eleMas: 100,
}

export function referenceStats(
  element: ElementWithPhyKey
): Record<string, number> {
  return { ...REFERENCE_STATS, [`${element}_dmg_`]: 0.466 }
}

/** Character element, including the Traveler variants that have no data row. */
export function elementOf(charKey: CharacterKey): ElementWithPhyKey {
  const data = (
    allStats.char.data as Record<string, { ele?: ElementWithPhyKey }>
  )[charKey]
  if (data?.ele) return data.ele
  const suffix = charKey.startsWith('Traveler')
    ? charKey.slice('Traveler'.length).toLowerCase()
    : ''
  return allElementWithPhyKeys.includes(suffix as ElementWithPhyKey)
    ? (suffix as ElementWithPhyKey)
    : 'physical'
}

const isSubstatKey = (key: string): key is SubstatKey =>
  (allSubstatKeys as readonly string[]).includes(key)

/** One max 5★ roll of `key`, in internal and display units. */
export function statBump(key: string): { internal: number; display: number } {
  const display = isSubstatKey(key) ? getSubstatValue(key, 5, 'max') : 1
  return { display, internal: key.endsWith('_') ? display / 100 : display }
}

export function findLoadout(
  database: ArtCharDatabase,
  charKey: CharacterKey
): TeamCharacter | undefined {
  for (const team of database.teams.values) {
    for (const loadout of team.loadoutData) {
      if (!loadout) continue
      const teamChar = database.teamChars.get(loadout.teamCharId)
      if (teamChar?.key === charKey) return teamChar
    }
  }
  return undefined
}

/** The loadout's configured optimization target, when it is a concrete path. */
export function findLoadoutTarget(
  database: ArtCharDatabase,
  charKey: CharacterKey
): string[] | undefined {
  const loadout = findLoadout(database, charKey)
  if (!loadout) return undefined
  const target = database.optConfigs.get(loadout.optConfigId)?.optimizationTarget
  return target?.[0] === 'custom' ? undefined : target
}

/**
 * Gear-free character data at the reference build: level 90, talents 10,
 * constellation 0, equipped weapon, no artifacts, the loadout's conditionals.
 */
export function buildReferenceData(
  database: ArtCharDatabase,
  charKey: CharacterKey
): Data[] | undefined {
  const character = database.chars.get(charKey)
  if (!character) return undefined
  const weapon: ICachedWeapon =
    database.weapons.get(character.equippedWeapon) ?? defaultInitialWeapon()
  const characterSheet = getCharSheet(charKey, database.gender)
  const weaponSheet = getWeaponSheet(weapon.key)
  if (!characterSheet || !weaponSheet) return undefined

  const loadout = findLoadout(database, charKey)
  const info: CharInfo = {
    ...character,
    level: 90,
    ascension: 6,
    constellation: 0,
    talent: { auto: 10, skill: 10, burst: 10 },
    infusionAura: loadout?.infusionAura ?? '',
    customMultiTargets: [],
    conditional: { resonance: {}, reaction: {}, ...loadout?.conditional },
    bonusStats: {},
    enemyOverride: {},
    hitMode: loadout?.hitMode ?? 'avgHit',
    reaction: loadout?.reaction,
  }

  const restWeaponSheetData = { ...weaponSheet.data }
  delete restWeaponSheetData.display
  const weaponSheetsData = mergeData([
    restWeaponSheetData,
    displayDataMap[getCharStat(charKey).weaponType],
  ])
  const sheetData = mergeData([
    characterSheet.data,
    weaponSheetsData,
    allArtifactData,
  ])

  return [
    dataObjForCharacterNew(info),
    dataObjForWeapon(weapon),
    sheetData,
    common, // must stay last
    resonanceData,
    reactionData,
  ]
}
