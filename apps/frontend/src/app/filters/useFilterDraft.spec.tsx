import { act, renderHook } from '@testing-library/react'
import { useFilterDraft } from '@genshin-optimizer/gi/ui'

const committed = { a: ['x'], b: true }
const defaults = { a: [] as string[], b: true }

describe('useFilterDraft', () => {
  it('edits only the draft; the committed object is untouched', () => {
    const { result } = renderHook(() => useFilterDraft(committed, defaults))
    act(() => result.current.update({ b: false }))
    expect(result.current.draft).toEqual({ a: ['x'], b: false })
    expect(committed).toEqual({ a: ['x'], b: true })
  })

  it('reset restores schema defaults in the draft without touching committed', () => {
    const { result } = renderHook(() => useFilterDraft(committed, defaults))
    act(() => result.current.update({ a: ['y'] }))
    act(() => result.current.reset())
    expect(result.current.draft).toEqual({ a: [], b: true })
    expect(committed).toEqual({ a: ['x'], b: true })
  })

  it('seed re-reads the committed state (drawer reopen discards the draft)', () => {
    const { result, rerender } = renderHook(
      ({ c }) => useFilterDraft(c, defaults),
      { initialProps: { c: committed } }
    )
    act(() => result.current.update({ a: ['z'] }))
    rerender({ c: { a: ['q'], b: false } })
    act(() => result.current.seed())
    expect(result.current.draft).toEqual({ a: ['q'], b: false })
  })
})
