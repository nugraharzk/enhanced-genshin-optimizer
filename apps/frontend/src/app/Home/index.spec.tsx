import { render, screen } from '@testing-library/react'
import { HashRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomePage from './index'

// Counts are the dashboard's whole data story: pin them.
vi.mock('../nav', () => ({
  NAV_ITEMS: [],
  NAV_GROUPS: [],
  useNavCounts: () => ({ arts: 5, weapons: 2, chars: 3, teams: 1 }),
}))

// jsdom build lacks localStorage; the capture card reads/writes it.
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>()
  const shim: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => [...store.keys()][i] ?? null,
    removeItem: (k: string) => void store.delete(k),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
  }
  ;(globalThis as any).localStorage = shim
}

vi.mock('../tauri', () => ({ getInvoke: () => null }))

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('HomePage', () => {
  it('renders four stat cards with live counts and route links', () => {
    render(
      <HashRouter>
        <HomePage />
      </HashRouter>
    )
    expect(screen.getByText('5')).toBeTruthy()
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('3')).toBeTruthy()
    expect(screen.getByText('1')).toBeTruthy()
    const hrefOf = (label: string) =>
      screen.getAllByText(label)[0].closest('a')!.getAttribute('href')
    expect(hrefOf('Artifacts')).toBe('#/artifacts')
    expect(hrefOf('Weapons')).toBe('#/weapons')
    expect(hrefOf('Characters')).toBe('#/characters')
    expect(hrefOf('Teams')).toBe('#/teams')
  })

  it('hides capture UI in the web build', () => {
    render(
      <HashRouter>
        <HomePage />
      </HashRouter>
    )
    expect(screen.queryByText(/capture/i)).toBeNull()
  })
})
