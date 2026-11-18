import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Switch from '@radix-ui/react-switch'
import {
  CircleStop,
  FolderOpen,
  HardDriveDownload,
  Pickaxe,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { getInvoke } from '../tauri'
import { dumpStorage, useCapture } from './useCapture'
import { toast } from './toast'

const itemCls =
  'flex cursor-pointer items-center gap-2.5 rounded-[calc(var(--go-radius)-5px)] px-2 py-1.5 text-sm text-fg outline-none select-none data-[highlighted]:bg-surface2'

/**
 * In-SPA replacement for the injected floating DOM panel: backups, restore,
 * folder, and the capture worker toggle. Renders nothing in a plain browser.
 */
export default function DesktopPanel() {
  const invoke = getInvoke()
  if (!invoke) return null
  return <Panel invoke={invoke} />
}

function Panel({
  invoke,
}: {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>
}) {
  const { running, auto, setAuto, arm, stopWatching } = useCapture()
  const [backups, setBackups] = useState<string[]>([])
  // Backups are fetched once on mount; the menu re-renders from this state.
  const refresh = () => {
    invoke('list_backups')
      .then((names) => setBackups((names as string[]).slice(-8).reverse()))
      .catch(() => setBackups([]))
  }
  useEffect(refresh, []) // eslint-disable-line react-hooks/exhaustive-deps

  const backup = async () => {
    try {
      const path = (await invoke('save_backup', {
        json: JSON.stringify(dumpStorage()),
      })) as string
      toast(path)
    } catch (e) {
      toast(String(e), true)
    }
  }

  const openFolder = () => {
    invoke('backup_folder')
      .then((path) => toast(path as string))
      .catch((e) => toast(String(e), true))
  }

  const restore = async (name: string) => {
    try {
      const json = (await invoke('read_backup', { name })) as string
      // Safety net first: snapshot the *current* state before touching it.
      const safePath = (await invoke('save_backup', {
        json: JSON.stringify(dumpStorage()),
      })) as string
      const data = JSON.parse(json) as Record<string, string>
      localStorage.clear()
      for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v)
      toast(`Restored: current state saved to ${safePath}`)
      setTimeout(() => location.reload(), 1000)
    } catch (e) {
      toast(String(e), true)
    }
  }

  const label = (name: string) => {
    const ms = Number(/go-(\d+)\.json$/.exec(name)?.[1])
    return Number.isFinite(ms) && ms > 0
      ? new Date(ms).toLocaleString()
      : name
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Desktop backups"
          className="flex w-full cursor-pointer items-center gap-2 rounded-go px-2.5 py-1.5 text-[13px] font-medium text-fg-dim outline-none transition-colors hover:bg-surface2 hover:text-fg focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <HardDriveDownload className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">Desktop</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          onCloseAutoFocus={(e) => e.preventDefault()}
          className="z-[2200] min-w-56 rounded-go border border-line-strong bg-surface p-1.5 shadow-go-lg data-[state=open]:animate-go-in"
        >
          <DropdownMenu.Item onSelect={backup} className={itemCls}>
            <HardDriveDownload className="size-4 shrink-0 text-accent" />
            Backup to disk
          </DropdownMenu.Item>

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={itemCls}>
              <FolderOpen className="size-4 shrink-0 text-accent" />
              <span className="flex-1">Restore…</span>
              <span className="text-xs text-fg-dim">›</span>
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={4}
                className="z-[2200] max-h-[60vh] min-w-52 overflow-y-auto rounded-go border border-line-strong bg-surface p-1.5 shadow-go-lg data-[state=open]:animate-go-in"
              >
                {backups.length === 0 ? (
                  <DropdownMenu.Label className="px-2 py-1.5 text-xs text-fg-dim">
                    No backups yet
                  </DropdownMenu.Label>
                ) : (
                  backups.map((name) => (
                    <DropdownMenu.Item
                      key={name}
                      onSelect={() => restore(name)}
                      className={itemCls}
                    >
                      {label(name)}
                    </DropdownMenu.Item>
                  ))
                )}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Item onSelect={openFolder} className={itemCls}>
            <FolderOpen className="size-4 shrink-0 text-accent" />
            Open folder
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="my-1.5 h-px bg-line" />

          <DropdownMenu.Label className="flex items-center justify-between gap-2 px-2 py-1.5 text-sm text-fg">
            Auto-capture
            <Switch.Root
              checked={auto}
              onCheckedChange={setAuto}
              className="relative h-5 w-9 shrink-0 rounded-full border border-line-strong bg-surface2 outline-none transition-colors data-[state=checked]:bg-accent focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              <Switch.Thumb className="block size-3.5 translate-x-0.5 rounded-full bg-surface transition-transform data-[state=checked]:translate-x-[18px]" />
            </Switch.Root>
          </DropdownMenu.Label>

          <DropdownMenu.Item
            onSelect={() => (running ? stopWatching() : void arm())}
            className={itemCls}
          >
            {running ? (
              <CircleStop className="size-4 shrink-0 text-accent" />
            ) : (
              <Pickaxe className="size-4 shrink-0 text-accent" />
            )}
            {running ? 'Stop waiting' : 'Capture now'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
