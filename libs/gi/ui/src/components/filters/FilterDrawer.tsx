import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * Shared side drawer for page filters. Presentation only: it never touches a
 * database — pages own the draft state, Apply and Reset.
 *
 * Closing via Escape or the backdrop calls onClose without applying, so a
 * half-edited draft never leaks into the committed state.
 */
export function FilterDrawer({
  open,
  onClose,
  onApply,
  onReset,
  activeCount,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  onApply: () => void
  onReset: () => void
  activeCount: number
  title: string
  children: ReactNode
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[3000] bg-black/60 animate-go-in" />
        <Dialog.Content
          className="fixed inset-y-0 right-0 z-[3001] flex w-[min(92vw,400px)] flex-col border-l border-line bg-surface shadow-go-lg outline-none animate-go-in"
          aria-describedby={undefined}
        >
          <header className="flex items-center gap-2 border-b border-line px-4 py-3">
            <Dialog.Title className="text-title flex-1">{title}</Dialog.Title>
            {activeCount > 0 && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-accent">
                {activeCount}
              </span>
            )}
            <Dialog.Close
              aria-label="Close filters"
              className="grid size-8 cursor-pointer place-items-center rounded-go border-0 bg-transparent text-fg-dim outline-none hover:bg-surface2 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <X className="size-4" />
            </Dialog.Close>
          </header>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
            {children}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
            <button
              type="button"
              onClick={onReset}
              className="cursor-pointer rounded-go border border-line bg-surface2 px-3 py-1.5 text-sm font-medium text-fg-dim outline-none transition-colors hover:border-line-strong hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onApply}
              className="cursor-pointer rounded-go border border-transparent bg-accent px-3.5 py-1.5 text-sm font-semibold text-accent-fg outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              Apply
            </button>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

/** One titled group inside the drawer. */
export function FilterSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-label m-0">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  )
}
