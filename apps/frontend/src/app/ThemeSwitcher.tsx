import { THEME_LIST, useGOTheme } from '@genshin-optimizer/gi/theme'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronDown, Palette } from 'lucide-react'

/**
 * First component on the new stack: Radix DropdownMenu + Tailwind utilities,
 * no MUI. Themes come from the shared token layer, so switching here also
 * repaints every MUI screen.
 */
export default function ThemeSwitcher({ wide = false }: { wide?: boolean }) {
  const { themeId, setThemeId } = useGOTheme()
  const active = THEME_LIST.find((t) => t.id === themeId)
  const dark = THEME_LIST.filter((t) => t.mode === 'dark')
  const light = THEME_LIST.filter((t) => t.mode === 'light')

  const row = (t: (typeof THEME_LIST)[number]) => (
    <DropdownMenu.Item
      key={t.id}
      onSelect={() => setThemeId(t.id)}
      className="flex cursor-pointer items-center gap-2.5 rounded-[max(calc(var(--go-radius)-4px),4px)] px-2 py-1.5 text-sm text-fg outline-none select-none data-[highlighted]:bg-surface2"
    >
      {/* two-tone swatch: page background behind the accent colour */}
      <span
        className="grid size-4 shrink-0 place-items-center rounded-full border border-line-strong"
        style={{ background: t.bg }}
      >
        <span className="size-2 rounded-full" style={{ background: t.accent }} />
      </span>
      <span className="flex-1">
        {t.name}
        <span className="ml-2 text-xs text-fg-dim">{t.hint}</span>
      </span>
      {themeId === t.id && <Check className="size-4 text-accent" />}
    </DropdownMenu.Item>
  )

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Interface theme"
          className={`inline-flex h-9 cursor-pointer items-center gap-2 rounded-go border border-line bg-surface2 px-2.5 font-sans text-sm font-medium text-fg outline-none transition-colors hover:border-line-strong hover:text-accent-hover focus-visible:ring-2 focus-visible:ring-accent/60 ${
            wide ? 'w-full justify-between' : ''
          }`}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Palette className="size-4 shrink-0 text-accent" />
            <span
              className={
                wide ? 'truncate text-left' : 'hidden truncate md:inline'
              }
            >
              {active?.name ?? 'Theme'}
            </span>
          </span>
          {wide && <ChevronDown className="size-3.5 shrink-0 text-fg-dim" />}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[2200] max-h-[72vh] min-w-64 overflow-y-auto rounded-go border border-line-strong bg-surface p-1.5 shadow-go-lg data-[state=open]:animate-go-in"
        >
          <DropdownMenu.Label className="px-2 py-1 text-[11px] font-semibold tracking-wider text-fg-dim uppercase">
            Dark
          </DropdownMenu.Label>
          {dark.map(row)}

          <DropdownMenu.Separator className="my-1.5 h-px bg-line" />

          <DropdownMenu.Label className="px-2 py-1 text-[11px] font-semibold tracking-wider text-fg-dim uppercase">
            Light
          </DropdownMenu.Label>
          {light.map(row)}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
