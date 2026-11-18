import { useDataManagerValues } from '@genshin-optimizer/common/database-ui'
import {
  useBoolState,
  useMediaQueryUp,
} from '@genshin-optimizer/common/react-util'
import {
  CardThemed,
  ShowingAndSortOptionSelect,
  useInfScroll,
} from '@genshin-optimizer/common/ui'
import { filterFunction, sortFunction } from '@genshin-optimizer/common/util'
import type { SubstatKey } from '@genshin-optimizer/gi/consts'
import { useDatabase, useDisplayArtifact } from '@genshin-optimizer/gi/db-ui'
import {
  type ArtifactSortKey,
  artifactSortKeys,
} from '@genshin-optimizer/gi/schema'
import {
  AddArtInfo,
  ArtifactCard,
  ArtifactEditor,
  InfoComponent,
} from '@genshin-optimizer/gi/ui'
import {
  artifactFilterConfigs,
  artifactSortConfigs,
  artifactSortMap,
} from '@genshin-optimizer/gi/util'
import type { VerdictFilter } from '@genshin-optimizer/gi/triage'
import { applyTriageView } from '@genshin-optimizer/gi/triage'
import AddIcon from '@mui/icons-material/Add'
import DifferenceIcon from '@mui/icons-material/Difference'
import { Box, Button, CardContent, Grid, Skeleton } from '@mui/material'
import { Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ArtifactFilter, { ArtifactRedButtons } from './ArtifactFilter'
import DupModal from './DupModal'
import ArtifactInfoDisplay from './InfoDisplay'
import { TriageToolbar } from './TriageToolbar'
import { useTriage } from './useTriage'

const columns = { xs: 1, sm: 2, md: 3, lg: 3, xl: 4 }
const numToShowMap = { xs: 5, sm: 6, md: 12, lg: 12, xl: 12 }

export default function PageArtifact() {
  const { t } = useTranslation(['artifact', 'ui'])
  const database = useDatabase()
  const artifactDisplayState = useDisplayArtifact()

  const [artifactIdToEdit, setArtifactIdToEdit] = useState<string | undefined>()

  const [showDup, onShowDup, onHideDup] = useBoolState(false)

  const [triageOn, setTriageOn] = useState(false)
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>('all')
  const triage = useTriage(database)

  const brPt = useMediaQueryUp()

  const { sortType, effFilter, ascending } = artifactDisplayState

  const effFilterSet = useMemo(
    () => new Set(effFilter),
    [effFilter]
  ) as Set<SubstatKey>

  useEffect(() => {
  }, [])

  const noArtifact = !database.arts.values.length
  const sortConfigs = useMemo(
    () => artifactSortConfigs(effFilterSet),
    [effFilterSet]
  )
  const filterConfigs = useMemo(
    () => artifactFilterConfigs({ effFilterSet: effFilterSet }),
    [effFilterSet]
  )
  const deferredArtifactDisplayState = useDeferredValue(artifactDisplayState)
  const allArts = useDataManagerValues(database.arts)
  const totalArtNum = allArts.length

  const filteredArtIds = useMemo(() => {
    const {
      sortType = artifactSortKeys[0],
      ascending = false,
      filterOption,
    } = deferredArtifactDisplayState
    return allArts
      .filter(filterFunction(filterOption, filterConfigs))
      .sort(
        sortFunction(artifactSortMap[sortType] ?? [], ascending, sortConfigs)
      )
      .map((art) => art.id)
  }, [deferredArtifactDisplayState, allArts, filterConfigs, sortConfigs])

  useEffect(() => {
    if (triageOn && triage.status === 'idle') void triage.start()
  }, [triageOn, triage.status, triage.start])

  // Triage mode filters and sorts locally; the shared display state is never
  // written, so the web and desktop builds stay compatible.
  const visibleArtIds = useMemo(() => {
    if (!triageOn || !triage.results) return filteredArtIds
    return applyTriageView(
      allArts.map((art) => art.id),
      triage.results,
      verdictFilter
    )
  }, [triageOn, triage.results, verdictFilter, allArts, filteredArtIds])

  const { numShow, setTriggerElement } = useInfScroll(
    numToShowMap[brPt],
    visibleArtIds.length
  )
  const artifactIdsToShow = useMemo(
    () => visibleArtIds.slice(0, numShow),
    [visibleArtIds, numShow]
  )
  //for pagination
  const totalShowing =
    visibleArtIds.length !== totalArtNum
      ? `${visibleArtIds.length}/${totalArtNum}`
      : `${totalArtNum}`
  const showingTextProps = {
    numShowing: artifactIdsToShow.length,
    total: totalShowing,
    t: t,
    namespace: 'artifact',
  }
  const sortByButtonProps = {
    sortKeys: [...artifactSortKeys],
    value: sortType,
    onChange: (sortType: ArtifactSortKey) =>
      database.displayArtifact.set({ sortType }),
    ascending: ascending,
    onChangeAsc: (ascending: boolean) =>
      database.displayArtifact.set({ ascending }),
  }
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Suspense fallback={false}>
        <ArtifactEditor
          artifactIdToEdit={artifactIdToEdit}
          cancelEdit={() => setArtifactIdToEdit(undefined)}
          allowUpload
          allowEmpty
        />
      </Suspense>
      <Suspense fallback={false}>
        <DupModal
          show={showDup}
          onHide={onHideDup}
          setArtifactIdToEdit={setArtifactIdToEdit}
        />
      </Suspense>
      <InfoComponent
        pageKey="artifactPage"
        modalTitle={t('info.title')}
        text={t('tipsOfTheDay', { returnObjects: true }) as string[]}
      >
        <ArtifactInfoDisplay />
      </InfoComponent>

      {noArtifact && <AddArtInfo />}

      <CardThemed>
        <CardContent>
          <Box
            sx={{
              pb: 2,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            <ShowingAndSortOptionSelect
              showingTextProps={showingTextProps}
              sortByButtonProps={triageOn ? undefined : sortByButtonProps}
            />
            <ArtifactFilter artifactIds={visibleArtIds} />
          </Box>
          {triageOn && triage.results ? (
            <TriageToolbar
              database={database}
              status={triage.status}
              progress={triage.progress}
              results={triage.results}
              visibleIds={visibleArtIds}
              filter={verdictFilter}
              onFilterChange={setVerdictFilter}
              onRecompute={() => void triage.start()}
            />
          ) : null}
          <ArtifactRedButtons artifactIds={visibleArtIds} />
        </CardContent>
      </CardThemed>
      <Grid container columns={columns} spacing={1}>
        <Grid size="grow">
          <Button
            fullWidth
            onClick={() => setArtifactIdToEdit('new')}
            color="info"
            startIcon={<AddIcon />}
          >
            {t('addNew')}
          </Button>
        </Grid>
        <Grid size={1}>
          <Button
            fullWidth
            onClick={onShowDup}
            color="info"
            startIcon={<DifferenceIcon />}
          >
            {t('showDup')}
          </Button>
        </Grid>
        <Grid size={1}>
          <Button
            fullWidth
            onClick={() => setTriageOn((on) => !on)}
            color={triageOn ? 'success' : 'info'}
            variant={triageOn ? 'contained' : 'outlined'}
          >
            Triage
          </Button>
        </Grid>
      </Grid>
      <Suspense
        fallback={
          <Skeleton
            variant="rectangular"
            sx={{ width: '100%', height: '100%', minHeight: 5000 }}
          />
        }
      >
        <Grid container spacing={1} columns={columns}>
          {artifactIdsToShow.map((artId) => (
            <Grid key={artId} size={1}>
              <ArtifactCard
                artifactId={artId}
                effFilter={effFilterSet}
                triage={triage.results?.get(artId)}
                onDelete={() => database.arts.remove(artId)}
                onEdit={() => setArtifactIdToEdit(artId)}
                setLocation={(location) =>
                  database.arts.set(artId, { location })
                }
                onLockToggle={() =>
                  database.arts.set(artId, ({ lock }) => ({ lock: !lock }))
                }
              />
            </Grid>
          ))}
        </Grid>
        {visibleArtIds.length !== artifactIdsToShow.length && (
          <Skeleton
            ref={(node) => {
              if (!node) return
              setTriggerElement(node)
            }}
            sx={{ borderRadius: 1 }}
            variant="rectangular"
            width="100%"
            height={100}
          />
        )}
      </Suspense>
    </Box>
  )
}
