import { useSyncExternalStore } from 'react'
import {
  getSharedStatus,
  subscribeSharedStatus,
  syncNow,
  type SharedStatus,
} from './sharedStore'

const LABEL: Record<SharedStatus['mode'], string> = {
  shared: 'Shared',
  local: 'Local only',
  offline: 'Hub offline',
  conflict: 'Changed elsewhere',
}

const DOT: Record<SharedStatus['mode'], string> = {
  shared: 'bg-accent',
  local: 'bg-fg-dim/50',
  offline: 'bg-amber-500',
  conflict: 'bg-red-500',
}

/**
 * Tiny hub indicator in the sidebar: proves the web app and the desktop app are
 * looking at the same database, and is the reload button when they disagree.
 */
export default function SharedBadge() {
  const status = useSyncExternalStore(
    subscribeSharedStatus,
    getSharedStatus,
    getSharedStatus
  )
  const time = status.at
    ? new Date(status.at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <button
      type="button"
      onClick={syncNow}
      title={
        status.mode === 'conflict'
          ? 'The other app wrote to the shared database — click to reload'
          : 'Database is shared with the desktop app — click to save now'
      }
      className="flex w-full items-center gap-2 rounded-go px-2.5 py-1 text-left text-[11px] text-fg-dim outline-none hover:bg-surface2 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <span className={`size-1.5 shrink-0 rounded-full ${DOT[status.mode]}`} />
      <span className="flex-1 truncate">
        {LABEL[status.mode]}
        {status.mode === 'shared' && time ? ` · ${time}` : ''}
      </span>
    </button>
  )
}
