import { FilterDrawer, activeFilterCount } from '@genshin-optimizer/gi/ui'
import { fireEvent, render, screen } from '@testing-library/react'

describe('activeFilterCount', () => {
  it('counts keys that differ from defaults; arrays compare by members', () => {
    expect(activeFilterCount({ a: [], b: true }, { a: [], b: true })).toBe(0)
    expect(activeFilterCount({ a: [], b: true }, { a: ['x'], b: true })).toBe(1)
    expect(activeFilterCount({ a: [] }, {})).toBe(0)
    expect(activeFilterCount({ a: [] }, { a: ['x', 'y'] })).toBe(1)
    expect(activeFilterCount({ a: [1] }, { a: [1] })).toBe(0)
  })
})

describe('FilterDrawer', () => {
  const setup = () => {
    const onApply = vi.fn()
    const onReset = vi.fn()
    const onClose = vi.fn()
    render(
      <FilterDrawer
        open
        onClose={onClose}
        onApply={onApply}
        onReset={onReset}
        activeCount={2}
        title="Filters"
      >
        <input aria-label="draft" />
      </FilterDrawer>
    )
    return { onApply, onReset, onClose }
  }

  it('edits inside the body never call onApply', () => {
    const { onApply } = setup()
    fireEvent.change(screen.getByLabelText('draft'), { target: { value: 'x' } })
    expect(onApply).not.toHaveBeenCalled()
  })

  it('Apply and Reset fire their callbacks; the count is visible', () => {
    const { onApply, onReset } = setup()
    expect(screen.getByText('2')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it('Escape closes without applying', () => {
    const { onApply, onClose } = setup()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onApply).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
