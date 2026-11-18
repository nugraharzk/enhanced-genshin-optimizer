import { useDataManagerKeys } from '@genshin-optimizer/common/database-ui'
import { useDatabase } from '@genshin-optimizer/gi/db-ui'
import {
  Anvil,
  Archive,
  BookOpen,
  Flower,
  ScanLine,
  Settings,
  Users,
  UsersRound,
  Wrench,
} from 'lucide-react'
import type { ComponentType } from 'react'

export type NavItem = {
  key: string
  to: string
  /** i18n key in the `ui` namespace */
  i18Key: string
  icon: ComponentType<{ className?: string }>
  count?: 'arts' | 'weapons' | 'chars' | 'teams'
}

/**
 * One list drives both the sidebar and the command palette, so a new page only
 * has to be added here.
 */
export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Collection',
    items: [
      {
        key: 'artifacts',
        to: '/artifacts',
        i18Key: 'tabs.artifacts',
        icon: Flower,
        count: 'arts',
      },
      {
        key: 'weapons',
        to: '/weapons',
        i18Key: 'tabs.weapons',
        icon: Anvil,
        count: 'weapons',
      },
      {
        key: 'characters',
        to: '/characters',
        i18Key: 'tabs.characters',
        icon: Users,
        count: 'chars',
      },
      {
        key: 'teams',
        to: '/teams',
        i18Key: 'tabs.teams',
        icon: UsersRound,
        count: 'teams',
      },
      {
        key: 'archive',
        to: '/archive',
        i18Key: 'tabs.archive',
        icon: Archive,
      },
    ],
  },
  {
    label: 'Lab',
    items: [
      {
        key: 'tools',
        to: '/tools',
        i18Key: 'tabs.tools',
        icon: Wrench,
      },
      {
        key: 'scanner',
        to: '/scanner',
        i18Key: 'tabs.scanner',
        icon: ScanLine,
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        key: 'doc',
        to: '/doc',
        i18Key: 'tabs.doc',
        icon: BookOpen,
      },
      {
        key: 'setting',
        to: '/setting',
        i18Key: 'tabs.setting',
        icon: Settings,
      },
    ],
  },
]

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)

export type NavCounts = Record<'arts' | 'weapons' | 'chars' | 'teams', number>

/** Live inventory counts, shown as badges next to the nav labels. */
export function useNavCounts(): NavCounts {
  const database = useDatabase()
  return {
    arts: useDataManagerKeys(database.arts).length,
    weapons: useDataManagerKeys(database.weapons).length,
    chars: useDataManagerKeys(database.chars).length,
    teams: useDataManagerKeys(database.teams).length,
  }
}
