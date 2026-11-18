import type { TriageResult } from '@genshin-optimizer/gi/triage'
import { computeTriage } from '@genshin-optimizer/gi/triage'
import type { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import { useCallback, useState } from 'react'

export type TriageStatus = 'idle' | 'running' | 'done'

/**
 * Runs triage on demand and keeps the result for the session. Nothing here is
 * persisted: the shared DB is left untouched by design.
 */
export function useTriage(database: ArtCharDatabase) {
  const [status, setStatus] = useState<TriageStatus>('idle')
  const [results, setResults] = useState<Map<string, TriageResult>>()
  const [progress, setProgress] = useState({ done: 0, total: 0 })

  const start = useCallback(async () => {
    setStatus('running')
    setProgress({ done: 0, total: database.chars.values.length })
    const map = await computeTriage(database, (done, total) =>
      setProgress({ done, total })
    )
    setResults(map)
    setStatus('done')
  }, [database])

  return { status, results, progress, start }
}
