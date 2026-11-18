import { THEME_LIST, useGOTheme } from '@genshin-optimizer/gi/theme'
import * as Dialog from '@radix-ui/react-dialog'
import { CornerDownLeft, Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { NAV_ITEMS } from './nav'

type Command = {
  id: string
  group: string
  label: string
  hint?: string
  icon: ReactNode
  keywords: string
  run: () => void
}

/**
 * Ctrl/⌘-K palette over the same nav list as the sidebar, plus theme switching.
 * Radix Dialog gives us focus trapping, Esc and scroll lock for free.
 */
export default function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('ui')
  const navigate = useNavigate()
  const { themeId, setThemeId } = useGOTheme()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<Command[]>(() => {
    const goTo: Command[] = NAV_ITEMS.map((item) => {
      const Icon = item.icon
      return {
        id: `nav:${item.key}`,
        group: 'Go to',
        label: t(item.i18Key),
        icon: <Icon className="size-4" />,
        keywords: `${item.key} ${item.to}`,
        run: () => {
          onOpenChange(false)
          navigate(item.to)
        },
      }
    })
    const themes: Command[] = THEME_LIST.map((th) => ({
      id: `theme:${th.id}`,
      group: 'Theme',
      label: th.name,
      hint: th.hint,
      icon: (
        <span
          className="grid size-4 shrink-0 place-items-center rounded-full border border-line-strong"
          style={{ background: th.bg }}
        >
          <span
            className="size-2 rounded-full"
            style={{ background: th.accent }}
          />
        </span>
      ),
      keywords: `theme ${th.id} ${th.hint}`,
      run: () => {
        setThemeId(th.id)
        onOpenChange(false)
      },
    }))
    return [...goTo, ...themes]
  }, [navigate, onOpenChange, setThemeId, t])

  const q = query.trim().toLowerCase()
  const results = q
    ? commands.filter((c) =>
        `${c.label} ${c.group} ${c.keywords}`.toLowerCase().includes(q)
      )
    : commands

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
  }, [open])

  useEffect(() => {
    setIndex(0)
  }, [q])

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const runAt = (i: number) => results[i]?.run()

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || (e.key === 'n' && e.ctrlKey)) {
      e.preventDefault()
      setIndex((i) => (results.length ? (i + 1) % results.length : 0))
    } else if (e.key === 'ArrowUp' || (e.key === 'p' && e.ctrlKey)) {
      e.preventDefault()
      setIndex((i) =>
        results.length ? (i - 1 + results.length) % results.length : 0
      )
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runAt(index)
    }
  }

  let lastGroup = ''
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[3000] bg-black/50 backdrop-blur-[2px]" />
        <Dialog.Content className="fixed left-1/2 top-[10vh] z-[3001] w-[min(92vw,42rem)] -translate-x-1/2 overflow-hidden rounded-go border border-line-strong bg-surface font-sans text-fg shadow-2xl shadow-black/50 outline-none">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search pages and interface themes
          </Dialog.Description>

          <div className="flex items-center gap-2.5 border-b border-line px-3.5 py-3">
            <Search className="size-4 shrink-0 text-fg-dim" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search pages, themes…"
              className="w-full border-0 bg-transparent p-0 text-sm text-fg outline-none placeholder:text-fg-dim/70"
            />
            <kbd className="shrink-0 rounded border border-line px-1 py-0.5 text-[10px] font-semibold text-fg-dim">
              esc
            </kbd>
          </div>

          <div
            ref={listRef}
            className="max-h-[min(58vh,24rem)] overflow-y-auto p-1.5"
          >
            {results.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-fg-dim">
                Nothing matches “{query}”
              </p>
            )}
            {results.map((c, i) => {
              const showGroup = c.group !== lastGroup
              lastGroup = c.group
              return (
                <div key={c.id}>
                  {showGroup && (
                    <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-fg-dim/80">
                      {c.group}
                    </div>
                  )}
                  <button
                    type="button"
                    data-active={i === index}
                    onMouseMove={() => setIndex(i)}
                    onClick={() => runAt(i)}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-[calc(var(--go-radius)-5px)] border-0 px-2 py-1.5 text-left text-sm outline-none ${
                      i === index
                        ? 'bg-surface2 text-fg'
                        : 'bg-transparent text-fg-dim hover:bg-surface2/60'
                    }`}
                  >
                    <span className="shrink-0">{c.icon}</span>
                    <span className="flex-1 truncate">{c.label}</span>
                    {c.hint && (
                      <span className="shrink-0 text-xs text-fg-dim">
                        {c.hint}
                      </span>
                    )}
                    {c.id === `theme:${themeId}` && (
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-accent">
                        active
                      </span>
                    )}
                    {i === index && (
                      <CornerDownLeft className="size-3.5 shrink-0 text-fg-dim" />
                    )}
                  </button>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-4 border-t border-line px-3.5 py-2 text-[11px] text-fg-dim">
            <span>↑↓ navigate</span>
            <span>↵ open</span>
            <span className="flex-1" />
            <span>{results.length} results</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
