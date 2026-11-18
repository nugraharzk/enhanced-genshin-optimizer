import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import go_icon from './go_icon.png'
import { NAV_GROUPS, useNavCounts } from './nav'
import DesktopPanel from './desktop/DesktopPanel'
import SharedBadge from './SharedBadge'
import ThemeSwitcher from './ThemeSwitcher'

declare const __VERSION__: string

/**
 * Web shell navigation: Radix/Tailwind only, driven by the design tokens, so it
 * repaints with the theme instead of fighting MUI.
 */
export default function Sidebar({
  onNavigate,
  onOpenPalette,
}: {
  onNavigate?: () => void
  onOpenPalette?: () => void
}) {
  const { t } = useTranslation('ui')
  const { pathname } = useLocation()
  const counts = useNavCounts()

  return (
    <div className="flex h-full flex-col gap-1 p-3 font-sans">
      <RouterLink
        to="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 rounded-go px-1.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <img src={go_icon} alt="" className="size-8 shrink-0 rounded-go" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold leading-tight text-fg">
            {t('pageTitle')}
          </span>
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-fg-dim">
            v{__VERSION__} · local
          </span>
        </span>
      </RouterLink>

      {onOpenPalette && (
        <button
          type="button"
          onClick={onOpenPalette}
          className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-go border border-line bg-surface2 px-2.5 py-1.5 text-xs text-fg-dim outline-none transition-colors hover:border-line-strong hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <Search className="size-3.5 shrink-0" />
          <span className="flex-1 text-left">Jump to…</span>
          <kbd className="rounded border border-line px-1 py-0.5 font-sans text-[10px] font-semibold">
            Ctrl K
          </kbd>
        </button>
      )}

      <nav className="mt-2 flex min-h-0 flex-1 flex-col overflow-y-auto">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            <div className="text-label px-2.5 pb-1">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active =
                  item.to === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.to)
                const n = item.count ? counts[item.count] : undefined
                return (
                  <RouterLink
                    key={item.key}
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex items-center gap-2.5 rounded-[max(calc(var(--go-radius)-4px),4px)] px-2.5 py-1.5 text-[13px] font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/60 ${
                      active
                        ? 'bg-accent/12 text-accent'
                        : 'text-fg-dim hover:bg-surface2 hover:text-fg'
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" />
                    )}
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{t(item.i18Key)}</span>
                    {n ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors ${
                          active
                            ? 'bg-accent text-accent-fg'
                            : 'bg-surface2 text-fg-dim'
                        }`}
                      >
                        {n}
                      </span>
                    ) : null}
                  </RouterLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-1 border-t border-line pt-2">
        <DesktopPanel />
        <SharedBadge />
        <ThemeSwitcher wide />
      </div>
    </div>
  )
}

