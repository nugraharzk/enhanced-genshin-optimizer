import {
  Database,
  Flower,
  FolderSync,
  HardDriveDownload,
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
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            Overview
          </h1>
          <p className="mt-0.5 text-xs text-fg-dim">
            Local theorycrafting workspace: optimizer, database, and backups
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-fg-dim sm:self-auto">
          <span className="size-2 rounded-full bg-emerald-500" />
          <span>Local Storage Active</span>
        </div>
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
        <RouterLink to="/setting" className={quickBtn}>
          <Upload className="size-4 shrink-0 text-accent" />
          Impor Database (GOOD)
        </RouterLink>
        <RouterLink to="/scanner" className={quickBtn}>
          <ScanLine className="size-4 shrink-0 text-accent" />
          Scan Artefak (OCR)
        </RouterLink>
        <RouterLink to="/characters" className={quickBtn}>
          <Wrench className="size-4 shrink-0 text-accent" />
          Build Optimizer
        </RouterLink>
        {invoke && (
          <button type="button" onClick={backup} className={quickBtn}>
            <HardDriveDownload className="size-4 shrink-0 text-accent" />
            Save Backup
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
            {capture.running ? 'Stop Capture' : 'Capture Now'}
          </button>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <section
          aria-label="Storage status"
          className="rounded-go border border-line bg-surface p-4 shadow-go-sm"
        >
          <div className="flex items-center gap-2">
            <Database className="size-4 text-accent" />
            <span className="text-[13px] font-semibold text-fg">
              Storage & Persistence
            </span>
          </div>
          <p className="mt-1 text-xs text-fg-dim">
            Semua kalkulasi, artefak, dan karakter tersimpan secara aman di perangkat lokal Anda tanpa cloud pihak ketiga.
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-fg-dim">
            <RouterLink
              to="/setting"
              className="font-medium text-accent hover:underline"
            >
              Kelola Database & Backup &rarr;
            </RouterLink>
          </div>
        </section>

        {invoke ? (
          <CaptureCard {...capture} />
        ) : (
          <section
            aria-label="Desktop sync"
            className="rounded-go border border-line bg-surface p-4 shadow-go-sm"
          >
            <div className="flex items-center gap-2">
              <FolderSync className="size-4 text-accent" />
              <span className="text-[13px] font-semibold text-fg">
                Web & Desktop Shared Hub
              </span>
            </div>
            <p className="mt-1 text-xs text-fg-dim">
              Versi web ini dapat tersinkronisasi otomatis dengan aplikasi desktop lewat file basis data bersama di AppData.
            </p>
            <div className="mt-3 flex items-center gap-3 text-xs text-fg-dim">
              <RouterLink
                to="/doc"
                className="font-medium text-accent hover:underline"
              >
                Dokumentasi & Fitur &rarr;
              </RouterLink>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
