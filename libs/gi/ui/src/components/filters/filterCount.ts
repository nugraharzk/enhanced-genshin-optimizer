/**
 * Number of filter keys whose value differs from its default — the badge on
 * the Filters button and the drawer header. Arrays count as one key and
 * compare by members, so ['a'] and ['a'] don't read as a change.
 */
export function activeFilterCount(
  defaults: Record<string, unknown>,
  value: Record<string, unknown>
): number {
  let n = 0
  for (const key of Object.keys(defaults)) {
    const d = defaults[key]
    const v = value[key] ?? d
    if (Array.isArray(d) && Array.isArray(v)) {
      if (d.length !== v.length || v.some((x) => !d.includes(x))) n++
    } else if (!Object.is(d, v)) n++
  }
  return n
}
