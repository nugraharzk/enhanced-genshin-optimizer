import { Container } from '@mui/material'
import * as Dialog from '@radix-ui/react-dialog'
import { Menu, Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink } from 'react-router-dom'
import CommandPalette from './CommandPalette'
import Footer from './Footer'
import go_icon from './go_icon.png'
import Sidebar from './Sidebar'
import { Toaster } from './desktop/toast'

/**
 * Web layout: persistent sidebar on desktop, top bar + sheet on mobile, and a
 * Ctrl/⌘-K palette. Everything here is token-driven (no hardcoded colours), so
 * it follows whichever of the 12 themes is active.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation('ui')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div
      className="min-h-screen font-sans text-fg"
      style={{
        background:
          'radial-gradient(ellipse 110% 60% at 50% 0%, color-mix(in srgb, var(--go-accent) 7%, var(--go-bg)) 0%, var(--go-bg) 55%) fixed',
      }}
    >
      <div className="flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-line bg-surface/70 backdrop-blur md:block">
          <Sidebar onOpenPalette={() => setPaletteOpen(true)} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-surface/85 px-2.5 py-2 backdrop-blur md:hidden">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSheetOpen(true)}
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-go border border-line bg-surface2 text-fg-dim outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <Menu className="size-4" />
            </button>
            <RouterLink
              to="/"
              className="flex min-w-0 items-center gap-2 rounded-go outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <img src={go_icon} alt="" className="size-6 shrink-0 rounded" />
              <span className="truncate text-sm font-semibold">
                {t('pageTitle')}
              </span>
            </RouterLink>
            <span className="flex-1" />
            <button
              type="button"
              aria-label="Search"
              onClick={() => setPaletteOpen(true)}
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-go border border-line bg-surface2 text-fg-dim outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <Search className="size-4" />
            </button>
          </header>

          <main id="back-to-top-anchor" className="min-w-0 flex-1">
            <Container
              maxWidth="xl"
              sx={{
                px: { xs: 0.75, sm: 1.5, md: 3 },
                py: { xs: 1, md: 2 },
              }}
            >
              {children}
            </Container>
          </main>

          <Footer />
        </div>
      </div>

      <Dialog.Root open={sheetOpen} onOpenChange={setSheetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[3000] bg-black/60 md:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-[3001] flex w-72 flex-col border-r border-line bg-surface shadow-2xl outline-none md:hidden">
            <Dialog.Title className="sr-only">Navigation</Dialog.Title>
            <Sidebar
              onNavigate={() => setSheetOpen(false)}
              onOpenPalette={() => {
                setSheetOpen(false)
                setPaletteOpen(true)
              }}
            />
            <Dialog.Close
              aria-label="Close navigation"
              className="absolute right-2 top-2 grid size-8 cursor-pointer place-items-center rounded-go border-0 bg-transparent text-fg-dim outline-none hover:bg-surface2 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <X className="size-4" />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <Toaster />
    </div>
  )
}
