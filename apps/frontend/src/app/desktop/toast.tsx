import { useEffect, useState } from 'react'

// One-off notifications ride a window event so any module (not just React
// components) can raise them; <Toaster/> is the single renderer.
type Toast = { id: number; text: string; bad: boolean }

export function toast(text: string, bad = false): void {
  window.dispatchEvent(
    new CustomEvent('go-toast', { detail: { text, bad } })
  )
}

/** Fixed bottom-right stack; each toast lives ~4 s. */
export function Toaster() {
  const [items, setItems] = useState<Toast[]>([])
  useEffect(() => {
    const onToast = (e: Event) => {
      const { text, bad } = (e as CustomEvent).detail as {
        text: string
        bad?: boolean
      }
      const id = Date.now() + Math.random()
      setItems((s) => [...s, { id, text, bad: !!bad }])
      setTimeout(
        () => setItems((s) => s.filter((i) => i.id !== id)),
        4000
      )
    }
    window.addEventListener('go-toast', onToast)
    return () => window.removeEventListener('go-toast', onToast)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[2200] flex flex-col items-end gap-2">
      {items.map((i) => (
        <div
          key={i.id}
          className={`max-w-sm rounded-go px-3 py-2 text-sm shadow-go-lg animate-go-in ${
            i.bad
              ? 'bg-red-500 text-white'
              : 'border border-line-strong bg-surface text-fg'
          }`}
        >
          {i.text}
        </div>
      ))}
    </div>
  )
}
