import { applyThemeVars, THEMES } from '@genshin-optimizer/gi/theme'

describe('shadow tokens', () => {
  it('publishes --go-shadow-sm/md/lg on <html>, differing per mode', () => {
    const r = document.documentElement

    applyThemeVars(THEMES.midnight)
    const dark = ['sm', 'md', 'lg'].map((s) =>
      r.style.getPropertyValue(`--go-shadow-${s}`)
    )
    expect(dark.every(Boolean)).toBe(true)
    expect(dark[1]).toMatch(/rgba\(0,\s*0,\s*0/)

    applyThemeVars(THEMES.paper)
    const light = ['sm', 'md', 'lg'].map((s) =>
      r.style.getPropertyValue(`--go-shadow-${s}`)
    )
    expect(light.every(Boolean)).toBe(true)
    // light themes shade with the slate ink, not pure black
    expect(light[1]).toMatch(/rgba\(15,\s*23,\s*42/)
    expect(light[1]).not.toBe(dark[1])
  })
})
