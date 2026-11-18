import { useCallback, useState } from 'react'

/**
 * Draft copy of a page's committed filter state. Editing only touches the
 * draft; Apply hands the draft back to the caller (which writes one DB key
 * set) and Reset restores the schema defaults — it never commits.
 *
 * Pages seed the draft from committed state when the drawer opens, so an
 * abandoned draft (Escape/backdrop) can't leak into the grid.
 */
export function useFilterDraft<T extends Record<string, unknown>>(
  committed: T,
  defaults: T
) {
  const [draft, setDraft] = useState<T>(committed)

  const seed = useCallback(() => setDraft(committed), [committed])

  const update = useCallback(
    (patch: Partial<T>) => setDraft((d) => ({ ...d, ...patch })),
    []
  )

  const reset = useCallback(() => setDraft(defaults), [defaults])

  return { draft, seed, update, reset }
}
