import type {
  ArtifactSetKey,
  CharacterKey,
  SubstatKey,
} from '@genshin-optimizer/gi/consts'
import type { Verdict } from './types'

export const KEEP_THRESHOLD = 12
export const MAYBE_THRESHOLD = 6
export const WEIGHTS_VERSION = 1

export function verdictFor(value: number): Verdict {
  if (value >= KEEP_THRESHOLD) return 'keep'
  if (value >= MAYBE_THRESHOLD) return 'maybe'
  return 'trash'
}

/**
 * Sets whose identity is a stat other than damage, so a piece of that set is
 * worth keeping even when nobody in the roster is weighted for it yet.
 */
export const SET_IDENTITY: Partial<Record<ArtifactSetKey, string[]>> = {
  HuskOfOpulentDreams: ['def_'],
  EmblemOfSeveredFate: ['enerRech_'],
  ViridescentVenerer: ['eleMas'],
  DeepwoodMemories: ['eleMas'],
  GildedDreams: ['eleMas'],
  FlowerOfParadiseLost: ['eleMas'],
  OceanHuedClam: ['hp_'],
  MaidenBeloved: ['heal_'],
}

/**
 * Characters whose rotation depends on energy, as a damage weight per point of
 * ER (a max roll is ~5 points). Damage does not read ER, so this is curated.
 */
export const ER_NEED: Partial<Record<CharacterKey, number>> = {
  Bennett: 0.3,
  Xiangling: 0.35,
  Xingqiu: 0.3,
  Yelan: 0.3,
  RaidenShogun: 0.25,
  Mona: 0.25,
  Furina: 0.3,
}

/** Healers and shielders whose kit scales on a stat damage does not read. */
export const HEAL_SHIELD_SCALING: Partial<Record<CharacterKey, SubstatKey[]>> =
  {
    SangonomiyaKokomi: ['hp_'],
    Baizhu: ['hp_'],
    Zhongli: ['hp_'],
    Diona: ['hp_'],
    Barbara: ['hp_'],
    Sigewinne: ['hp_'],
    Charlotte: ['atk_'],
    Jean: ['atk_'],
  }
