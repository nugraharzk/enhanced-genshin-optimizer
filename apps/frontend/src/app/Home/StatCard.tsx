import type { ComponentType } from 'react'
import { Link as RouterLink } from 'react-router-dom'

/** One inventory tile in the stats row: icon + label + live count, whole card is a link. */
export default function StatCard({
  to,
  label,
  count,
  icon: Icon,
}: {
  to: string
  label: string
  count: number
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <RouterLink
      to={to}
      className="rounded-go border border-line bg-surface p-4 outline-none transition-colors hover:border-line-strong focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <div className="flex items-center gap-2 text-[13px] font-medium text-fg-dim">
        <Icon className="size-4 shrink-0 text-accent" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-fg">
        {count}
      </div>
    </RouterLink>
  )
}
