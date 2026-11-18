type SortConfig<T> = (id: T) => number | string
export type SortConfigs<Keys extends string, T> = Record<Keys, SortConfig<T>>

export function sortFunction<Keys extends string, T>(
  sortbyKeys: Keys[],
  ascending: boolean,
  configs: SortConfigs<Keys, T>,
  ascendingBypass: Keys[] = []
) {
  // A comparator runs O(n log n) times, and a sort config can be expensive
  // (artifact efficiency walks every substat). Derive each item's value once
  // per sort instead of twice per comparison.
  const memo = new Map<Keys, Map<T, number | string>>()
  const valueOf = (sortby: Keys, item: T): number | string => {
    let byItem = memo.get(sortby)
    if (!byItem) {
      byItem = new Map()
      memo.set(sortby, byItem)
    }
    let value = byItem.get(item)
    if (value === undefined) {
      value = configs[sortby](item)
      byItem.set(item, value)
    }
    return value
  }
  return (a: T, b: T): number => {
    for (const sortby of sortbyKeys) {
      let diff = 0
      const aV = valueOf(sortby, a)
      const bV = valueOf(sortby, b)
      if (typeof aV === 'string' && typeof bV === 'string')
        diff = aV.localeCompare(bV)
      else diff = (bV as number) - (aV as number)
      if (diff !== 0)
        return ascendingBypass.includes(sortby)
          ? diff
          : (ascending ? -1 : 1) * diff
    }
    return 0
  }
}

type FilterConfig<T> = (
  obj: T,
  filter: any,
  filters: { [str: string]: any }
) => boolean
export type FilterConfigs<Keys extends string, T> = Record<
  Keys,
  FilterConfig<T>
>
export function filterFunction<Keys extends string, T>(
  filterOptions: Partial<Record<Keys, any>>,
  filterConfigs: FilterConfigs<Keys, T>
) {
  return (obj: T) =>
    Object.entries(filterOptions).every(
      ([optionKey, optionVal]) =>
        filterConfigs[optionKey as Keys] &&
        filterConfigs[optionKey as Keys](obj, optionVal, filterOptions)
    )
}
