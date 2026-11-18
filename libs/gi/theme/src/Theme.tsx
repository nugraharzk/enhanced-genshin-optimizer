import { theme as commonTheme } from '@genshin-optimizer/common/ui'
import {
  CssBaseline,
  ThemeProvider as MuiThemeProvider,
  createTheme,
} from '@mui/material'
import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ThemeDef, ThemeId } from './tokens'
import {
  DEFAULT_THEME,
  THEMES,
  THEME_STORAGE_KEY,
  applyThemeVars,
  readStoredTheme,
} from './tokens'

const FONT_STACK =
  'Inter, Roboto, system-ui, -apple-system, "Segoe UI", sans-serif'

declare module '@mui/material/styles' {
  interface Palette {
    geo: Palette['primary']
    dendro: Palette['primary']
    pyro: Palette['primary']
    hydro: Palette['primary']
    cryo: Palette['primary']
    electro: Palette['primary']
    anemo: Palette['primary']
    physical: Palette['primary']

    vaporize: Palette['primary']
    melt: Palette['primary']
    spread: Palette['primary']
    aggravate: Palette['primary']
    overloaded: Palette['primary']
    superconduct: Palette['primary']
    electrocharged: Palette['primary']
    lunarcharged: Palette['primary']
    shattered: Palette['primary']
    swirl: Palette['primary']
    burning: Palette['primary']
    crystallize: Palette['primary']
    heal: Palette['primary']
    bloom: Palette['primary']
    burgeon: Palette['primary']
    hyperbloom: Palette['primary']
    lunarbloom: Palette['primary']
    lunarcrystallize: Palette['primary']
    stellarconduct: Palette['primary']
    stellarcryo: Palette['primary']
    stellarswirl: Palette['primary']
  }

  interface PaletteOptions {
    geo?: PaletteOptions['primary']
    dendro?: PaletteOptions['primary']
    pyro?: PaletteOptions['primary']
    hydro?: PaletteOptions['primary']
    cryo?: PaletteOptions['primary']
    electro?: PaletteOptions['primary']
    anemo?: PaletteOptions['primary']
    physical?: PaletteOptions['primary']

    vaporize?: PaletteOptions['primary']
    melt?: PaletteOptions['primary']
    spread?: PaletteOptions['primary']
    aggravate?: PaletteOptions['primary']
    overloaded?: PaletteOptions['primary']
    superconduct?: PaletteOptions['primary']
    electrocharged?: PaletteOptions['primary']
    lunarcharged?: PaletteOptions['primary']
    shattered?: PaletteOptions['primary']
    swirl?: PaletteOptions['primary']
    burning?: PaletteOptions['primary']
    crystallize?: PaletteOptions['primary']
    heal?: PaletteOptions['primary']
    bloom?: PaletteOptions['primary']
    burgeon?: PaletteOptions['primary']
    hyperbloom?: PaletteOptions['primary']
    lunarbloom?: PaletteOptions['primary']
    lunarcrystallize?: PaletteOptions['primary']
    stellarconduct?: PaletteOptions['primary']
    stellarcryo?: PaletteOptions['primary']
    stellarswirl?: PaletteOptions['primary']
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsColorOverrides {
    geo: true
    dendro: true
    pyro: true
    hydro: true
    cryo: true
    electro: true
    anemo: true
    physical: true

    vaporize: true
    melt: true
    spread: true
    aggravate: true
    overloaded: true
    superconduct: true
    electrocharged: true
    lunarcharged: true
    shattered: true
    swirl: true
    burning: true
    crystallize: true
    heal: true
    bloom: true
    burgeon: true
    hyperbloom: true
    lunarbloom: true
    lunarcrystallize: true
    stellarconduct: true
    stellarcryo: true
    stellarswirl: true
  }
}

declare module '@mui/material/Chip' {
  interface ChipPropsColorOverrides {
    geo: true
    dendro: true
    pyro: true
    hydro: true
    cryo: true
    electro: true
    anemo: true
    physical: true

    vaporize: true
    melt: true
    spread: true
    aggravate: true
    overloaded: true
    superconduct: true
    electrocharged: true
    lunarcharged: true
    shattered: true
    swirl: true
    burning: true
    crystallize: true
    heal: true
    bloom: true
    burgeon: true
    hyperbloom: true
    lunarbloom: true
    lunarcrystallize: true
    stellarconduct: true
    stellarcryo: true
    stellarswirl: true
  }
}

declare module '@mui/material/InputBase' {
  interface InputBasePropsColorOverrides {
    geo: true
    dendro: true
    pyro: true
    hydro: true
    cryo: true
    electro: true
    anemo: true
    physical: true

    vaporize: true
    melt: true
  }
}

declare module '@mui/material/SvgIcon' {
  interface SvgIconPropsColorOverrides {
    geo: true
    dendro: true
    pyro: true
    hydro: true
    cryo: true
    electro: true
    anemo: true
    physical: true

    vaporize: true
    melt: true
    spread: true
    aggravate: true
    overloaded: true
    superconduct: true
    electrocharged: true
    lunarcharged: true
    shattered: true
    swirl: true
    burning: true
    crystallize: true
    heal: true
    bloom: true
    burgeon: true
    hyperbloom: true
    lunarbloom: true
    lunarcrystallize: true
    stellarconduct: true
    stellarcryo: true
    stellarswirl: true
  }
}

/**
 * GO components hardcode `neutral900.main`, `neutral800.main`, ... instead of
 * `background.paper`, so overriding `background` alone leaves every card dark
 * in a light theme. Re-point the whole ramp at the tokens for light modes;
 * dark modes keep upstream's ramp, which already matches.
 */
function neutralRamp(t: ThemeDef) {
  const tones: Record<string, string> = {
    neutral100: t.text,
    neutral200: t.text,
    neutral300: t.text,
    neutral400: t.textDim,
    neutral500: t.textDim,
    neutral600: t.borderStrong,
    neutral700: t.border,
    neutral800: t.surface2,
    neutral900: t.surface,
    // CardThemed / CodeBlock paint surfaces from these, not background.paper
    contentDark: t.bg,
    contentDarker: t.bg,
    contentNormal: t.surface,
    contentLight: t.surface2,
  }
  const out: Record<string, unknown> = {}
  for (const [name, color] of Object.entries(tones))
    out[name] = commonTheme.palette.augmentColor({
      color: { main: color, light: color, dark: color },
      name,
    })
  return out
}

function themeFor(t: ThemeDef) {
  return createTheme({
    ...commonTheme,
    shape: { borderRadius: t.radius },
    typography: { ...commonTheme.typography, fontFamily: FONT_STACK },
    palette: {
      ...commonTheme.palette,
      mode: t.mode,
      background: { default: t.bg, paper: t.surface },
      text: {
        primary: t.text,
        secondary: t.textDim,
        disabled: `${t.textDim}80`,
      },
      divider: t.border,
      primary: commonTheme.palette.augmentColor({
        color: { main: t.accent, contrastText: t.accentText },
        name: 'primary',
      }),
      // every theme paints surfaces from its own tokens; upstream's fixed navy
      // ramp is what made all dark themes look identical
      ...(neutralRamp(t) as Record<string, never>),
    geo: commonTheme.palette.augmentColor({
      color: { main: '#f8ba4e', contrastText: '#222' },
      name: 'geo',
    }),
    dendro: commonTheme.palette.augmentColor({
      color: { main: '#a5c83b', contrastText: '#222' },
      name: 'dendro',
    }),
    pyro: commonTheme.palette.augmentColor({
      color: { main: '#FF3C32' },
      name: 'pyro',
    }),
    hydro: commonTheme.palette.augmentColor({
      color: { main: '#5680ff' },
      name: 'hydro',
    }),
    cryo: commonTheme.palette.augmentColor({
      color: { main: '#77a2e6', contrastText: '#fff' },
      name: 'cryo',
    }),
    electro: commonTheme.palette.augmentColor({
      color: { main: '#b25dcd' },
      name: 'electro',
    }),
    anemo: commonTheme.palette.augmentColor({
      color: { main: '#61dbbb', contrastText: '#fff' },
      name: 'anemo',
    }),
    physical: commonTheme.palette.augmentColor({
      color: { main: '#aaaaaa' },
      name: 'physical',
    }),
    vaporize: commonTheme.palette.augmentColor({
      color: { main: '#ffcb65' },
      name: 'vaporize',
    }),
    melt: commonTheme.palette.augmentColor({
      color: { main: '#ffcb65' },
      name: 'melt',
    }),
    spread: commonTheme.palette.augmentColor({
      color: { main: '#3bc8a7', contrastText: '#fff' },
      name: 'spread',
    }),
    aggravate: commonTheme.palette.augmentColor({
      color: { main: '#3ba0c8', contrastText: '#fff' },
      name: 'aggravate',
    }),
    overloaded: commonTheme.palette.augmentColor({
      color: { main: '#ff7e9a' },
      name: 'overloaded',
    }),
    superconduct: commonTheme.palette.augmentColor({
      color: { main: '#b7b1ff' },
      name: 'superconduct',
    }),
    electrocharged: commonTheme.palette.augmentColor({
      color: { main: '#e299fd' },
      name: 'electrocharged',
    }),
    lunarcharged: commonTheme.palette.augmentColor({
      color: { main: '#ecb8ff' },
      name: 'lunarcharged',
    }),
    shattered: commonTheme.palette.augmentColor({
      color: { main: '#98fffd' },
      name: 'shattered',
    }),
    swirl: commonTheme.palette.augmentColor({
      color: { main: '#66ffcb' },
      name: 'swirl',
    }),
    burning: commonTheme.palette.augmentColor({
      color: { main: '#bf2818' },
      name: 'burning',
    }),
    crystallize: commonTheme.palette.augmentColor({
      color: { main: '#f8ba4e' },
      name: 'crystallize',
    }),
    heal: commonTheme.palette.augmentColor({
      color: { main: '#c0e86c' },
      name: 'heal',
    }),
    bloom: commonTheme.palette.augmentColor({
      color: { main: '#47c83b', contrastText: '#222' },
      name: 'bloom',
    }),
    burgeon: commonTheme.palette.augmentColor({
      color: { main: '#c8b33b', contrastText: '#fff' },
      name: 'burgeon',
    }),
    hyperbloom: commonTheme.palette.augmentColor({
      color: { main: '#3b8dc8', contrastText: '#fff' },
      name: 'hyperbloom',
    }),
    lunarbloom: commonTheme.palette.augmentColor({
      color: { main: '#c8efc4', contrastText: '#222' },
      name: 'lunarbloom',
    }),
    lunarcrystallize: commonTheme.palette.augmentColor({
      color: { main: '#fff2baff', contrastText: '#222' },
      name: 'lunarcrystallize',
    }),
    stellarconduct: commonTheme.palette.augmentColor({
      color: { main: '#e4d1ff', contrastText: '#222' },
      name: 'stellarconduct',
    }),
    stellarcryo: commonTheme.palette.augmentColor({
      color: { main: '#abf7ff', contrastText: '#222' },
      name: 'stellarconduct_cryo',
    }),
    stellarswirl: commonTheme.palette.augmentColor({
      color: { main: '#a1facc', contrastText: '#222' },
      name: 'stellarswirl',
    }),
  },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none', boxShadow: 'var(--go-shadow-sm)' },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { borderRadius: t.radius, boxShadow: 'var(--go-shadow-sm)' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: t.radius, boxShadow: 'var(--go-shadow-md)' },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { borderRadius: t.radius, boxShadow: 'var(--go-shadow-md)' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: Math.max(6, t.radius - 4), fontWeight: 600 },
        },
      },
      MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } } },
      MuiTooltip: {
        styleOverrides: { tooltip: { borderRadius: 8, fontSize: 12 } },
      },
    },
  })
}

/** Static MUI theme for code paths outside the provider (tests, portals). */
export const theme = themeFor(THEMES[DEFAULT_THEME])

interface ThemeCtxValue {
  themeId: ThemeId
  setThemeId: (id: ThemeId) => void
}

const ThemeCtx = createContext<ThemeCtxValue>({
  themeId: DEFAULT_THEME,
  setThemeId: () => {},
})

export const useGOTheme = () => useContext(ThemeCtx)

export function GOThemeProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>(() => readStoredTheme())
  const def = THEMES[themeId]

  useEffect(() => {
    applyThemeVars(def)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, themeId)
    } catch {
      /* storage can be blocked */
    }
  }, [def, themeId])

  const muiTheme = useMemo(() => themeFor(def), [def])
  const value = useMemo(() => ({ themeId, setThemeId }), [themeId])

  return (
    <ThemeCtx.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeCtx.Provider>
  )
}
