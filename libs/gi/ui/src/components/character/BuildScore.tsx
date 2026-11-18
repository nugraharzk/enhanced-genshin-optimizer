import type { CharacterKey } from '@genshin-optimizer/gi/consts'
import { useCharacter, useDatabase } from '@genshin-optimizer/gi/db-ui'
import { computeBuildScore } from '@genshin-optimizer/gi/triage'
import { BootstrapTooltip } from '@genshin-optimizer/common/ui'
import { Chip } from '@mui/material'
import { useMemo } from 'react'

// Weights cost a compile plus 19 evaluations per character, so keep the last
// score per character/gear combination across mounts.
const scoreCache = new Map<string, number>()

export function BuildScore({ characterKey }: { characterKey: CharacterKey }) {
  const database = useDatabase()
  const character = useCharacter(characterKey)

  const score = useMemo(() => {
    if (!character) return undefined
    const equipped = Object.values(character.equippedArtifacts).filter(Boolean)
    if (!equipped.length) return undefined
    const cacheKey = [
      characterKey,
      character.level,
      character.ascension,
      character.talent.auto,
      character.talent.skill,
      character.talent.burst,
      character.equippedWeapon,
      ...equipped,
    ].join('|')
    const cached = scoreCache.get(cacheKey)
    if (cached !== undefined) return cached
    const value = computeBuildScore(database, characterKey)
    if (value === undefined) return undefined
    scoreCache.set(cacheKey, value)
    return value
  }, [database, character, characterKey])

  if (score === undefined) return null
  const rounded = Math.round(score)
  return (
    <BootstrapTooltip
      title={`The equipped pieces' stats are worth about ${rounded}% damage for this character.`}
    >
      <Chip size="small" label={`Gear ${rounded}%`} />
    </BootstrapTooltip>
  )
}
