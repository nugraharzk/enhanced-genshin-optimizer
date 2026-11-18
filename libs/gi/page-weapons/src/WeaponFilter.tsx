import {
  BootstrapTooltip,
  SolidToggleButtonGroup,
  SqBadge,
} from '@genshin-optimizer/common/ui'
import {
  bulkCatTotal,
  catTotal,
  handleMultiSelect,
} from '@genshin-optimizer/common/util'
import {
  allLocationCharacterKeys,
  allRarityKeys,
  allWeaponTypeKeys,
} from '@genshin-optimizer/gi/consts'
import type { ICachedWeapon } from '@genshin-optimizer/gi/db'
import { useDatabase } from '@genshin-optimizer/gi/db-ui'
import { getWeaponStat } from '@genshin-optimizer/gi/stats'
import {
  FilterDrawer,
  FilterSection,
  LocationFilterMultiAutocomplete,
  WeaponRarityToggle,
  WeaponToggle,
  activeFilterCount,
  useFilterDraft,
} from '@genshin-optimizer/gi/ui'
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import { Button, Chip, Grid, Stack, ToggleButton, Typography } from '@mui/material'
import { SlidersHorizontal } from 'lucide-react'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

const lockedValues = ['locked', 'unlocked'] as const

const lockedHandler = handleMultiSelect([...lockedValues])

/** Filter keys only — sort/edit ids must never be part of Apply. */
type WeaponFilterKeys = {
  weaponType: string[]
  rarity: number[]
  locked: string[]
  showEquipped: boolean
  showInventory: boolean
  locations: string[]
}

export const WEAPON_FILTER_DEFAULTS: WeaponFilterKeys = {
  weaponType: [...allWeaponTypeKeys],
  rarity: [...allRarityKeys],
  locked: [...lockedValues],
  showEquipped: true,
  showInventory: true,
  locations: [],
}

/**
 * Presentational filter body: all DB reads for totals, zero writes. The
 * drawer owns the draft; Apply writes it once.
 */
export function WeaponFilterBody({
  value,
  onChange,
  filteredIds,
}: {
  value: WeaponFilterKeys
  onChange: (patch: Partial<WeaponFilterKeys>) => void
  filteredIds: string[]
}) {
  const { t } = useTranslation(['page_weapon', 'ui'])
  const database = useDatabase()

  const { weaponType, rarity, locked, showEquipped, showInventory, locations } =
    value

  const weaponTotals = useMemo(
    () =>
      catTotal(allWeaponTypeKeys, (ct) =>
        database.weapons.entries.forEach(([id, weapon]) => {
          const wtk = getWeaponStat(weapon.key).weaponType
          ct[wtk].total++
          if (filteredIds.includes(id)) ct[wtk].current++
        })
      ),
    [database, filteredIds]
  )

  const weaponRarityTotals = useMemo(
    () =>
      catTotal(allRarityKeys, (ct) =>
        database.weapons.entries.forEach(([id, weapon]) => {
          const wr = getWeaponStat(weapon.key).rarity
          ct[wr].total++
          if (filteredIds.includes(id)) ct[wr].current++
        })
      ),
    [database, filteredIds]
  )

  const { lockedTotal, equippedTotal, locationTotal } = useMemo(() => {
    const catKeys = {
      lockedTotal: ['locked', 'unlocked'],
      equippedTotal: ['equipped', 'unequipped'],
      locationTotal: [...allLocationCharacterKeys, ''],
    } as const
    return bulkCatTotal(catKeys, (ctMap) =>
      database.weapons.entries.forEach(([id, weapon]) => {
        const location = weapon.location
        const lock = weapon.lock ? 'locked' : 'unlocked'
        const equipped = location ? 'equipped' : 'unequipped'
        ctMap['lockedTotal'][lock].total++
        ctMap['equippedTotal'][equipped].total++
        ctMap['locationTotal'][location].total++
        if (filteredIds.includes(id)) {
          ctMap['lockedTotal'][lock].current++
          ctMap['equippedTotal'][equipped].current++
          ctMap['locationTotal'][location].current++
        }
      })
    )
  }, [database, filteredIds])

  return (
    <div className="space-y-4">
      <FilterSection title="Type">
        <WeaponToggle
          fullWidth
          onChange={(weaponType) => onChange({ weaponType })}
          value={weaponType}
          totals={weaponTotals}
          size="small"
        />
      </FilterSection>

      <FilterSection title="Rarity">
        <WeaponRarityToggle
          sx={{ height: '100%' }}
          fullWidth
          onChange={(rarity) => onChange({ rarity })}
          value={rarity}
          totals={weaponRarityTotals}
          size="small"
        />
      </FilterSection>

      <FilterSection title="Inventory">
        <SolidToggleButtonGroup fullWidth value={locked} size="small">
          {lockedValues.map((v, i) => (
            <ToggleButton
              key={v}
              value={v}
              sx={{ display: 'flex', gap: 1 }}
              onClick={() => onChange({ locked: lockedHandler(locked, v) })}
            >
              {i ? <LockOpenIcon /> : <LockIcon />}
              <Trans t={t} i18nKey={`ui:${v}`} />
              <Chip
                label={lockedTotal[i ? 'unlocked' : 'locked']}
                size="small"
              />
            </ToggleButton>
          ))}
        </SolidToggleButtonGroup>
        <Button
          startIcon={<BusinessCenterIcon />}
          color={showInventory ? 'success' : 'secondary'}
          onClick={() => onChange({ showInventory: !showInventory })}
        >
          {t('weaponInInv')}{' '}
          <Chip
            sx={{ ml: 1 }}
            label={equippedTotal['unequipped']}
            size="small"
          />
        </Button>
        <Button
          startIcon={<PersonSearchIcon />}
          color={showEquipped ? 'success' : 'secondary'}
          onClick={() => onChange({ showEquipped: !showEquipped })}
        >
          {t('equippedWeapon')}{' '}
          <Chip sx={{ ml: 1 }} label={equippedTotal['equipped']} size="small" />
        </Button>
        <Suspense fallback={null}>
          <BootstrapTooltip
            title={showEquipped ? t('locationsTooltip') : ''}
            placement="top"
          >
            <span>
              <LocationFilterMultiAutocomplete
                totals={locationTotal}
                locations={showEquipped ? [] : locations}
                setLocations={(locations) => onChange({ locations })}
                disabled={showEquipped}
              />
            </span>
          </BootstrapTooltip>
        </Suspense>
      </FilterSection>
    </div>
  )
}

/**
 * Filters live in a draft-based side drawer: controls edit a local copy and
 * only Apply writes it to the database.
 */
function WeaponFilter({ weaponIds }: { weaponIds: string[] }) {
  const { t } = useTranslation(['page_weapon', 'ui'])
  const database = useDatabase()
  const [state, setState] = useState(database.displayWeapon.get())

  useEffect(() => {
    database.displayWeapon.follow((_r, dbMeta) => setState(dbMeta))
  }, [database])

  const committed = useMemo(
    () => ({
      weaponType: state.weaponType,
      rarity: state.rarity,
      locked: state.locked,
      showEquipped: state.showEquipped,
      showInventory: state.showInventory,
      locations: state.locations,
    }),
    [state]
  )

  const [open, setOpen] = useState(false)
  const { draft, seed, update, reset } = useFilterDraft(
    committed,
    WEAPON_FILTER_DEFAULTS
  )

  const openDrawer = () => {
    seed()
    setOpen(true)
  }

  const apply = () => {
    // filter keys only: sortType/ascending/editWeaponId stay untouched
    database.displayWeapon.set({ ...draft })
    setOpen(false)
  }

  return (
    <>
      <Button onClick={openDrawer} startIcon={<SlidersHorizontal size={16} />}>
        <Trans t={t} i18nKey="weaponFilterTitle">
          Weapon Filter
        </Trans>
        <SqBadge
          sx={{ ml: 1 }}
          color={
            activeFilterCount(WEAPON_FILTER_DEFAULTS, committed)
              ? 'success'
              : 'secondary'
          }
        >
          {activeFilterCount(WEAPON_FILTER_DEFAULTS, committed)}
        </SqBadge>
      </Button>
      <FilterDrawer
        open={open}
        onClose={() => setOpen(false)}
        onApply={apply}
        onReset={reset}
        activeCount={activeFilterCount(WEAPON_FILTER_DEFAULTS, draft)}
        title={t('weaponFilterTitle', 'Weapon Filters')}
      >
        <WeaponFilterBody
          value={draft as WeaponFilterKeys}
          onChange={update}
          filteredIds={weaponIds}
        />
      </FilterDrawer>
    </>
  )
}

export default WeaponFilter

function WeaponRedButtons({ weaponIds }: { weaponIds: string[] }) {
  const { t } = useTranslation(['page_weapon', 'ui'])
  const database = useDatabase()
  const { numDelete, numUnlock, numLock } = useMemo(() => {
    const weapons = weaponIds.map((id) =>
      database.weapons.get(id)
    ) as ICachedWeapon[]
    const numUnlock = weapons.reduce(
      (w, weapon) => w + (weapon.lock ? 0 : 1),
      0
    )
    const numLock = weapons.length - numUnlock
    const numDelete = weapons.reduce(
      (w, weapon) => w + (weapon.lock || weapon.location ? 0 : 1),
      0
    )
    return { numDelete, numUnlock, numLock }
  }, [weaponIds, database])

  const deleteWeapons = () =>
    window.confirm(`Are you sure you want to delete ${numDelete} weapons?`) &&
    weaponIds.map((id) => {
      const weapon = database.weapons.get(id)
      if (!weapon?.lock && !weapon?.location) database.weapons.remove(id)
    })

  const lockWeapons = () =>
    window.confirm(`Are you sure you want to lock ${numUnlock} weapons ?`) &&
    weaponIds.map((id) => database.weapons.set(id, { lock: true }))

  const unlockWeapons = () =>
    window.confirm(`Are you sure you want to unlock ${numLock} weapons ?`) &&
    weaponIds.map((id) => database.weapons.set(id, { lock: false }))

  return (
    <Grid
      container
      spacing={1}
      sx={{
        alignItems: 'center',
      }}
    >
      <Grid
        size={{
          xs: 16,
          sm: 8,
          md: 4,
        }}
      >
        <Button
          fullWidth
          color="error"
          disabled={!numDelete}
          onClick={deleteWeapons}
          startIcon={<DeleteForeverIcon />}
        >
          <Trans t={t} i18nKey="button.deleteWeapons">
            Delete Weapons
          </Trans>
          <SqBadge sx={{ ml: 1 }} color={numDelete ? 'success' : 'secondary'}>
            {numDelete}
          </SqBadge>
        </Button>
      </Grid>
      <Grid
        size={{
          xs: 16,
          sm: 8,
          md: 4,
        }}
      >
        <Button
          fullWidth
          color="error"
          disabled={!numLock}
          onClick={unlockWeapons}
          startIcon={<LockOpenIcon />}
        >
          <Trans t={t} i18nKey="button.unlockWeapons">
            Unlock Weapons
          </Trans>
          <SqBadge sx={{ ml: 1 }} color={numLock ? 'success' : 'secondary'}>
            {numLock}
          </SqBadge>
        </Button>
      </Grid>
      <Grid
        size={{
          xs: 16,
          sm: 8,
          md: 4,
        }}
      >
        <Button
          fullWidth
          color="error"
          disabled={!numUnlock}
          onClick={lockWeapons}
          startIcon={<LockIcon />}
        >
          <Trans t={t} i18nKey="button.lockWeapons">
            Lock Weapons
          </Trans>
          <SqBadge sx={{ ml: 1 }} color={numUnlock ? 'success' : 'secondary'}>
            {numUnlock}
          </SqBadge>
        </Button>
      </Grid>
      <Grid
        size={12}
        sx={{
          display: 'flex',
          justifyContent: 'space-around',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
          }}
        >
          <Trans t={t} i18nKey="buttonHint">
            Note: the red buttons above only apply to
            <b>currently filtered weapons</b>
          </Trans>
        </Typography>
      </Grid>
    </Grid>
  )
}

export { WeaponRedButtons }
