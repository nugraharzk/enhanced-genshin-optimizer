import {
  Flower,
  ScanLine,
  Swords,
  Upload,
  Users,
  UsersRound,
  Wrench,
} from 'lucide-react'
import type { ComponentType } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { useNavCounts } from '../nav'
import { getInvoke } from '../tauri'
import { dumpStorage, useCapture } from '../desktop/useCapture'
import { toast } from '../desktop/toast'
import CaptureCard from './CaptureCard'
import StatCard from './StatCard'

const STATS: {
  to: string
  label: string
  count: 'arts' | 'weapons' | 'chars' | 'teams'
  icon: ComponentType<{ className?: string }>
}[] = [
  { to: '/artifacts', label: 'Artifacts', count: 'arts', icon: Flower },
  { to: '/weapons', label: 'Weapons', count: 'weapons', icon: Swords },
  { to: '/characters', label: 'Characters', count: 'chars', icon: Users },
  { to: '/teams', label: 'Teams', count: 'teams', icon: UsersRound },
]

const quickBtn =
  'flex cursor-pointer items-center gap-2 rounded-go border border-line bg-surface px-3 py-2 text-[13px] font-medium text-fg outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-accent/60'

/** Local-first dashboard: inventory at a glance, quick actions, capture status. */
export default function HomePage() {
  const counts = useNavCounts()
  const invoke = getInvoke()
  const capture = useCapture()

  const backup = async () => {
    try {
      const path = (await invoke!('save_backup', {
        json: JSON.stringify(dumpStorage()),
      })) as string
      toast(path)
    } catch (e) {
      toast(String(e), true)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 font-sans">
      <header>
        <h1 className="text-title text-lg">Home</h1>
        <p className="mt-0.5 text-xs text-fg-dim">
          Everything runs locally: optimizer, database, and backups
        </p>
      </header>

      <section aria-label="Inventory" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <StatCard
            key={s.to}
            to={s.to}
            label={s.label}
            count={counts[s.count]}
            icon={s.icon}
          />
        ))}
      </section>

      {counts.arts === 0 && counts.chars === 0 && (
        <section
          aria-label="Getting started"
          className="rounded-go border border-line bg-surface p-4 shadow-go-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-fg">
                Database masih kosong
              </h2>
              <p className="mt-1 text-xs text-fg-dim">
                Mulai dengan mengimpor inventaris (GOOD JSON) atau lakukan scan artefak dari game Anda.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <RouterLink
                to="/setting"
                className="flex cursor-pointer items-center gap-2 rounded-go bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <Upload className="size-3.5 shrink-0" />
                Impor GOOD JSON
              </RouterLink>
              <RouterLink
                to="/scanner"
                className="flex cursor-pointer items-center gap-2 rounded-go border border-line bg-surface2 px-3 py-1.5 text-xs font-medium text-fg outline-none transition-colors hover:border-line-strong hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60"
              >
                <ScanLine className="size-3.5 shrink-0 text-accent" />
                Buka Scanner
              </RouterLink>
            </div>
          </div>
        </section>
      )}

      <section aria-label="Quick actions" className="flex flex-wrap gap-2">
        <RouterLink to="/artifacts" className={quickBtn}>
          <Flower className="size-4 shrink-0 text-accent" />
          Artifacts
        </RouterLink>
        <RouterLink to="/teams" className={quickBtn}>
          <UsersRound className="size-4 shrink-0 text-accent" />
          Teams
        </RouterLink>
        <RouterLink to="/tools" className={quickBtn}>
          <Wrench className="size-4 shrink-0 text-accent" />
          Tools
        </RouterLink>
        {invoke && (
          <button type="button" onClick={backup} className={quickBtn}>
            Save backup
          </button>
        )}
        {invoke && (
          <button
            type="button"
            onClick={() =>
              capture.running ? capture.stopWatching() : void capture.arm()
            }
            className={quickBtn}
          >
            {capture.running ? 'Stop capture' : 'Capture now'}
          </button>
        )}
      </section>

      {invoke && <CaptureCard {...capture} />}
    </div>
  )
}
