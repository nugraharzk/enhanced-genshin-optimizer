/**
 * Design tokens for GO's design system.
 *
 * One source of truth for every surface in the app: the MUI theme is derived
 * from these tokens (so the ~300 existing screens restyle at once) and the new
 * Tailwind/Radix components read the same values through CSS variables.
 *
 * Adding a theme = adding one entry here. Nothing else needs to know about it.
 */

export type ThemeId =
  | 'midnight'
  | 'terminal'
  | 'abyss'
  | 'ember'
  | 'sakura'
  | 'graphite'
  | 'paper'
  | 'sand'
  | 'mint'
  | 'lilac'
  | 'sky'
  | 'rose'

export interface ThemeDef {
  id: ThemeId
  name: string
  hint: string
  mode: 'dark' | 'light'
  /** app background */
  bg: string
  /** cards, dialogs, menus */
  surface: string
  /** nested surfaces: inputs, wells, chips */
  surface2: string
  border: string
  borderStrong: string
  text: string
  textDim: string
  accent: string
  accentHover: string
  accentText: string
  /** corner radius in px, feeds both MUI shape and Tailwind's --radius-go */
  radius: number
}

export const THEMES: Record<ThemeId, ThemeDef> = {
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    hint: 'Dark · violet',
    mode: 'dark',
    bg: '#0a0a0f',
    surface: '#14141c',
    surface2: '#1d1d28',
    border: '#262633',
    borderStrong: '#3a3a4d',
    text: '#ececf3',
    textDim: '#9c9cb0',
    accent: '#7c6cff',
    accentHover: '#9184ff',
    accentText: '#0a0a0f',
    radius: 12,
  },
  terminal: {
    id: 'terminal',
    name: 'Terminal',
    hint: 'Dark · mint',
    mode: 'dark',
    bg: '#07100e',
    surface: '#0e1a17',
    surface2: '#16241f',
    border: '#1f332c',
    borderStrong: '#2f4a40',
    text: '#e6f2ed',
    textDim: '#93ada2',
    accent: '#3ddc97',
    accentHover: '#5ce9ab',
    accentText: '#04120d',
    radius: 6,
  },
  paper: {
    id: 'paper',
    name: 'Paper',
    hint: 'Light · slate',
    mode: 'light',
    bg: '#f6f7f9',
    surface: '#ffffff',
    surface2: '#eef1f5',
    border: '#e0e4ea',
    borderStrong: '#c6ccd6',
    text: '#15181f',
    textDim: '#5b626f',
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    accentText: '#ffffff',
    radius: 10,
  },
  sand: {
    id: 'sand',
    name: 'Sand',
    hint: 'Light · ember',
    mode: 'light',
    bg: '#faf7f2',
    surface: '#ffffff',
    surface2: '#f3ede2',
    border: '#e4dbcb',
    borderStrong: '#cbbc9f',
    text: '#1e1a15',
    textDim: '#6b6154',
    accent: '#c2410c',
    accentHover: '#a8380a',
    accentText: '#fffaf5',
    radius: 14,
  },

  // ---- dark ----
  abyss: {
    id: 'abyss',
    name: 'Abyss',
    hint: 'Dark · cyan',
    mode: 'dark',
    bg: '#050b14',
    surface: '#0b1522',
    surface2: '#12202f',
    border: '#1b2c3d',
    borderStrong: '#2a4257',
    text: '#e3f0fa',
    textDim: '#8fa8bd',
    accent: '#22d3ee',
    accentHover: '#4ae0f5',
    accentText: '#04121a',
    radius: 8,
  },
  ember: {
    id: 'ember',
    name: 'Ember',
    hint: 'Dark · orange',
    mode: 'dark',
    bg: '#0f0c0a',
    surface: '#1a1512',
    surface2: '#241d18',
    border: '#33281f',
    borderStrong: '#4a3a2b',
    text: '#f5ece3',
    textDim: '#b09a86',
    accent: '#ff8a3d',
    accentHover: '#ffa25e',
    accentText: '#170c04',
    radius: 10,
  },
  sakura: {
    id: 'sakura',
    name: 'Sakura',
    hint: 'Dark · pink',
    mode: 'dark',
    bg: '#120a12',
    surface: '#1d111d',
    surface2: '#291829',
    border: '#3a2338',
    borderStrong: '#523250',
    text: '#fbe9f6',
    textDim: '#bfa0b8',
    accent: '#f472b6',
    accentHover: '#f98cc6',
    accentText: '#1a060f',
    radius: 16,
  },
  graphite: {
    id: 'graphite',
    name: 'Graphite',
    hint: 'Dark · lime',
    mode: 'dark',
    bg: '#0b0b0c',
    surface: '#15151a',
    surface2: '#1e1e25',
    border: '#2b2b33',
    borderStrong: '#40404b',
    text: '#f0f0f2',
    textDim: '#a3a3ad',
    accent: '#a3e635',
    accentHover: '#b8ef55',
    accentText: '#0a1206',
    radius: 4,
  },

  // ---- light ----
  mint: {
    id: 'mint',
    name: 'Mint',
    hint: 'Light · green',
    mode: 'light',
    bg: '#f3faf6',
    surface: '#ffffff',
    surface2: '#e6f4ec',
    border: '#d3e8dc',
    borderStrong: '#b3d3c3',
    text: '#10231a',
    textDim: '#4f6b5c',
    accent: '#0b8060',
    accentHover: '#096b50',
    accentText: '#ffffff',
    radius: 12,
  },
  lilac: {
    id: 'lilac',
    name: 'Lilac',
    hint: 'Light · violet',
    mode: 'light',
    bg: '#f8f6fd',
    surface: '#ffffff',
    surface2: '#efeaf9',
    border: '#e0d7f2',
    borderStrong: '#c4b5e6',
    text: '#1a1426',
    textDim: '#625a75',
    accent: '#7c3aed',
    accentHover: '#6d28d9',
    accentText: '#ffffff',
    radius: 14,
  },
  sky: {
    id: 'sky',
    name: 'Sky',
    hint: 'Light · blue',
    mode: 'light',
    bg: '#f4f9fd',
    surface: '#ffffff',
    surface2: '#e7f1fa',
    border: '#d3e3f2',
    borderStrong: '#b0cbe4',
    text: '#0e1a26',
    textDim: '#4d6377',
    accent: '#0369a1',
    accentHover: '#075985',
    accentText: '#ffffff',
    radius: 10,
  },
  rose: {
    id: 'rose',
    name: 'Rose',
    hint: 'Light · red',
    mode: 'light',
    bg: '#fdf5f7',
    surface: '#ffffff',
    surface2: '#fbe9ee',
    border: '#f3d6de',
    borderStrong: '#e6b3c1',
    text: '#251016',
    textDim: '#6f5159',
    accent: '#e11d48',
    accentHover: '#be123c',
    accentText: '#ffffff',
    radius: 12,
  },
}

export const THEME_LIST: ThemeDef[] = Object.values(THEMES)
export const DEFAULT_THEME: ThemeId = 'midnight'
export const THEME_STORAGE_KEY = 'go-design-theme'

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && v in THEMES
}

export function readStoredTheme(): ThemeId {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY)
    if (isThemeId(v)) return v
  } catch {
    /* storage can be blocked */
  }
  return DEFAULT_THEME
}

/**
 * Publish a theme as CSS variables on <html> so Tailwind arbitrary values and
 * plain CSS can use it, and so a theme switch is a repaint, not a re-render.
 */
export function applyThemeVars(t: ThemeDef) {
  const r = document.documentElement
  r.dataset.goTheme = t.id
  r.dataset.goMode = t.mode
  r.style.colorScheme = t.mode
  const vars: Record<string, string> = {
    '--go-bg': t.bg,
    '--go-surface': t.surface,
    '--go-surface-2': t.surface2,
    '--go-border': t.border,
    '--go-border-strong': t.borderStrong,
    '--go-text': t.text,
    '--go-text-dim': t.textDim,
    '--go-accent': t.accent,
    '--go-accent-hover': t.accentHover,
    '--go-accent-text': t.accentText,
    '--go-radius': `${t.radius}px`,
  }
  for (const [k, v] of Object.entries(vars)) r.style.setProperty(k, v)
}
