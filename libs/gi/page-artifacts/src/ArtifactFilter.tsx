import { SqBadge } from '@genshin-optimizer/common/ui'
import type { ICachedArtifact } from '@genshin-optimizer/gi/db'
import { useDatabase, useDisplayArtifact } from '@genshin-optimizer/gi/db-ui'
import { initialFilterOption } from '@genshin-optimizer/gi/schema'
import type { FilterOption } from '@genshin-optimizer/gi/schema'
import {
  ArtifactFilterDisplay,
  FilterDrawer,
  activeFilterCount,
  useFilterDraft,
} from '@genshin-optimizer/gi/ui'
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import { Button, Grid, Typography } from '@mui/material'
import { SlidersHorizontal } from 'lucide-react'
import { Suspense, useCallback, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

/**
 * Filters live in a draft-based side drawer: controls edit a local copy and
 * only Apply writes it to the database, so a half-made change never
 * re-renders the grid behind the drawer.
 */
export default function ArtifactFilter({
  artifactIds,
}: {
  artifactIds: string[]
}) {
  const { t } = useTranslation(['artifact', 'ui'])
  const database = useDatabase()
  const { filterOption } = useDisplayArtifact()
  const [open, setOpen] = useState(false)
  const { draft, seed, update, reset } = useFilterDraft(
    filterOption,
    initialFilterOption()
  )

  const openDrawer = useCallback(() => {
    seed()
    setOpen(true)
  }, [seed])

  const apply = useCallback(() => {
    database.displayArtifact.set({ filterOption: draft })
    setOpen(false)
  }, [database, draft])

  return (
    <>
      <Button
        onClick={openDrawer}
        startIcon={<SlidersHorizontal size={16} />}
        aria-label="Filters"
      >
        <Trans t={t} i18nKey="artifactFilter">
          Artifact Filter
        </Trans>
        <SqBadge
          sx={{ ml: 1 }}
          color={
            activeFilterCount(initialFilterOption(), filterOption)
              ? 'success'
              : 'secondary'
          }
        >
          {activeFilterCount(initialFilterOption(), filterOption)}
        </SqBadge>
      </Button>
      <FilterDrawer
        open={open}
        onClose={() => setOpen(false)}
        onApply={apply}
        onReset={reset}
        activeCount={activeFilterCount(initialFilterOption(), draft)}
        title={t('artifactFilter', 'Filters')}
      >
        <Suspense fallback={null}>
          <ArtifactFilterDisplay
            filterOption={draft}
            filterOptionDispatch={update}
            filteredIds={artifactIds}
          />
        </Suspense>
      </FilterDrawer>
    </>
  )
}

export function ArtifactRedButtons({ artifactIds }: { artifactIds: string[] }) {
  const { t } = useTranslation(['artifact', 'ui'])
  const database = useDatabase()
  const { numDelete, numUnequip, numUnlock, numLock } = useMemo(() => {
    const artifacts = artifactIds.map((id) =>
      database.arts.get(id)
    ) as ICachedArtifact[]
    const numUnlock = artifacts.reduce((a, art) => a + (art.lock ? 0 : 1), 0)
    const numLock = artifacts.length - numUnlock
    const numDelete = numUnlock
    const numUnequip = artifacts.reduce(
      (a, art) => a + (art.location ? 1 : 0),
      0
    )
    return { numDelete, numUnequip, numUnlock, numLock }
  }, [artifactIds, database])

  const unequipArtifacts = () =>
    window.confirm(
      `Are you sure you want to unequip ${numUnequip} artifacts currently equipped on characters?`
    ) && artifactIds.map((id) => database.arts.set(id, { location: '' }))

  const deleteArtifacts = () =>
    window.confirm(`Are you sure you want to delete ${numDelete} artifacts?`) &&
    artifactIds.map(
      (id) => !database.arts.get(id)?.lock && database.arts.remove(id)
    )

  const lockArtifacts = () =>
    window.confirm(`Are you sure you want to lock ${numUnlock} artifacts?`) &&
    artifactIds.map((id) => database.arts.set(id, { lock: true }))

  const unlockArtifacts = () =>
    window.confirm(`Are you sure you want to unlock ${numLock} artifacts?`) &&
    artifactIds.map((id) => database.arts.set(id, { lock: false }))

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
          xs: 12,
          sm: 6,
          md: 3,
        }}
      >
        <Button
          fullWidth
          color="error"
          disabled={!numUnequip}
          onClick={unequipArtifacts}
          startIcon={<PersonOffIcon />}
        >
          <Trans t={t} i18nKey="button.unequipArtifacts">
            Unequip Artifacts
          </Trans>
          <SqBadge sx={{ ml: 1 }} color={numUnequip ? 'success' : 'secondary'}>
            {numUnequip}
          </SqBadge>
        </Button>
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 6,
          md: 3,
        }}
      >
        <Button
          fullWidth
          color="error"
          disabled={!numDelete}
          onClick={deleteArtifacts}
          startIcon={<DeleteForeverIcon />}
        >
          <Trans t={t} i18nKey="button.deleteArtifacts">
            Delete Artifacts
          </Trans>
          <SqBadge sx={{ ml: 1 }} color={numDelete ? 'success' : 'secondary'}>
            {numDelete}
          </SqBadge>
        </Button>
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 6,
          md: 3,
        }}
      >
        <Button
          fullWidth
          color="error"
          disabled={!numLock}
          onClick={unlockArtifacts}
          startIcon={<LockOpenIcon />}
        >
          <Trans t={t} i18nKey="button.unlockrtifacts">
            Unlock Artifacts
          </Trans>
          <SqBadge sx={{ ml: 1 }} color={numLock ? 'success' : 'secondary'}>
            {numLock}
          </SqBadge>
        </Button>
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 6,
          md: 3,
        }}
      >
        <Button
          fullWidth
          color="error"
          disabled={!numUnlock}
          onClick={lockArtifacts}
          startIcon={<LockIcon />}
        >
          <Trans t={t} i18nKey="button.lockArtifacts">
            Lock Artifacts
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
            <b>currently filtered artifacts</b>
          </Trans>
        </Typography>
      </Grid>
    </Grid>
  )
}
