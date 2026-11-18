import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import React from 'react'
import type { ReactNode } from 'react'
import type { Root } from 'react-dom/client'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import { installChunkRecovery } from './app/chunkRecovery'
import NewTab from './app/NewTab'
import { initSharedStore } from './app/sharedStore'
import './index.css'
import './tailwind.css'

// Recover from stale/failed chunk loads (server restarted or build swapped
// while this tab was open) instead of showing a stack trace.
installChunkRecovery()

let mode: 'main' | 'newtab' = 'main'
let root: Root | null = null

function render(node: ReactNode) {
  if (root) root.unmount()
  root = createRoot(document.getElementById('root') as HTMLElement)
  root.render(<React.StrictMode>{node}</React.StrictMode>)
}

// The shared database has to be in localStorage before the first render: GO
// reads its databases synchronously while mounting.
void initSharedStore().finally(() => render(<App />))

// Detect a storage event, and unmount the main page to show a newTab event.
function handleStorage(this: Window, event: StorageEvent) {
  if (event.key !== 'GONewTabDetection') return
  if (mode === 'newtab') return
  mode = 'newtab'
  this.document.title = 'ERROR'
  render(<NewTab />)
}
window.addEventListener('storage', handleStorage)
