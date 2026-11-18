import { getInvoke, isDesktop } from './tauri'

describe('tauri bridge', () => {
  it('returns null invoke and false isDesktop in a plain browser', () => {
    ;(window as any).__TAURI__ = undefined
    expect(getInvoke()).toBeNull()
    expect(isDesktop()).toBe(false)
  })
  it('exposes invoke when __TAURI__ is present', () => {
    const fake = vi.fn()
    ;(window as any).__TAURI__ = { core: { invoke: fake } }
    expect(getInvoke()).toBe(fake)
    expect(isDesktop()).toBe(true)
  })
})
