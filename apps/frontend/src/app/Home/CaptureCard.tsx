import { useDatabase } from '@genshin-optimizer/gi/db-ui'
import * as Switch from '@radix-ui/react-switch'
import { useEffect, useRef, useState } from 'react'
import { useCapture, onCaptured } from '../desktop/useCapture'

/**
 * Desktop-only capture status card: auto-capture toggle, live state line, and
 * the import of each captured GOOD dump (then a reload, like the panel does).
 */
export default function CaptureCard({
  running,
  auto,
  setAuto,
  arm,
  stopWatching,
}: ReturnType<typeof useCapture>) {
  const database = useDatabase()
  const [importing, setImporting] = useState(false)
  const prevRunning = useRef(running)
  const [stopped, setStopped] = useState(false)

  // Auto-arm once per launch, unless the user turned auto off.
  useEffect(() => {
    if (
      localStorage.getItem('nb_autocapture') !== '0' &&
      sessionStorage.getItem('nb_autocapture_done') === null
    ) {
      sessionStorage.setItem('nb_autocapture_done', '1')
      void arm()
    }
    // arm() is stable per mount; run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (prevRunning.current && !running) setStopped(true)
    prevRunning.current = running
  }, [running])

  useEffect(
    () =>
      onCaptured((good) => {
        setImporting(true)
        try {
          database.importGOOD(JSON.parse(good), true, true, false)
        } catch {
          // Bad dump: reload anyway; the DB keeps its prior state.
        }
        setTimeout(() => location.reload(), 800)
      }),
    [database]
  )

  const state = importing
    ? 'importing…'
    : running
      ? 'armed: waiting for Genshin login'
      : 'idle'

  return (
    <div className="rounded-go border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-fg">
          Genshin capture
        </span>
        <Switch.Root
          checked={auto}
          onCheckedChange={setAuto}
          aria-label="Auto capture"
          className="relative h-5 w-9 shrink-0 rounded-full border border-line-strong bg-surface2 outline-none transition-colors data-[state=checked]:bg-accent focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <Switch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-surface transition-transform data-[state=checked]:translate-x-[18px]" />
        </Switch.Root>
      </div>
      <div className="mt-1 text-xs text-fg-dim">{state}</div>
      {stopped && (
        <div className="mt-1 text-xs text-fg-dim">capture stopped</div>
      )}
    </div>
  )
}
