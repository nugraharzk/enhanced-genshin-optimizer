import type { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import type { TriageResult, Verdict } from '@genshin-optimizer/gi/triage'
import type { VerdictFilter } from '@genshin-optimizer/gi/triage'
import { Box, Button, Chip, Stack, Typography } from '@mui/material'
import type { TriageStatus } from './useTriage'

const FILTERS: { key: VerdictFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'keep', label: 'Keep' },
  { key: 'maybe', label: 'Maybe' },
  { key: 'trash', label: 'Trash' },
]

const VERDICT_COLOR: Record<Verdict, 'success' | 'warning' | 'default'> = {
  keep: 'success',
  maybe: 'warning',
  trash: 'default',
}

export function TriageToolbar({
  database,
  status,
  progress,
  results,
  visibleIds,
  filter,
  onFilterChange,
  onRecompute,
}: {
  database: ArtCharDatabase
  status: TriageStatus
  progress: { done: number; total: number }
  results: Map<string, TriageResult>
  visibleIds: string[]
  filter: VerdictFilter
  onFilterChange: (filter: VerdictFilter) => void
  onRecompute: () => void
}) {
  const counts: Record<Verdict, number> = { keep: 0, maybe: 0, trash: 0 }
  for (const result of results.values()) counts[result.verdict]++

  const idsWith = (verdict: Verdict, wantLocked: boolean) =>
    visibleIds.filter((id) => {
      const result = results.get(id)
      if (!result || result.verdict !== verdict) return false
      return !!database.arts.get(id)?.lock === wantLocked
    })

  const applyLock = (ids: string[], lock: boolean) => {
    if (!ids.length) return
    if (
      !window.confirm(
        `${lock ? 'Lock' : 'Unlock'} ${ids.length} artifacts?`
      )
    )
      return
    for (const id of ids) database.arts.set(id, { lock })
  }

  const lockKeep = () => applyLock(idsWith('keep', false), true)
  const unlockTrash = () => applyLock(idsWith('trash', true), false)

  return (
    <Stack spacing={1} sx={{ pb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {(['keep', 'maybe', 'trash'] as const).map((verdict) => (
          <Chip
            key={verdict}
            size="small"
            color={VERDICT_COLOR[verdict]}
            label={`${verdict.toUpperCase()} ${counts[verdict]}`}
          />
        ))}
        {status === 'running' && (
          <Typography variant="caption" color="text.secondary">
            weighing {progress.done}/{progress.total} characters
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" onClick={onRecompute} disabled={status === 'running'}>
          Recompute
        </Button>
      </Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        {FILTERS.map(({ key, label }) => (
          <Button
            key={key}
            size="small"
            variant={filter === key ? 'contained' : 'outlined'}
            onClick={() => onFilterChange(key)}
          >
            {label}
          </Button>
        ))}
        <Box sx={{ flexGrow: 1 }} />
        <Button size="small" color="success" onClick={lockKeep}>
          Lock KEEP
        </Button>
        <Button size="small" color="error" onClick={unlockTrash}>
          Unlock TRASH
        </Button>
      </Box>
      <Typography variant="caption" color="text.secondary">
        % damage this piece&apos;s stats are worth for its best owner.
      </Typography>
    </Stack>
  )
}
