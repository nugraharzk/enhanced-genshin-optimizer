import { sortFunction } from './sortFilters'

type Item = { id: number; a: number; b: number }

describe('sortFunction', () => {
  it('derives each sort value once per item, not per comparison', () => {
    const items: Item[] = Array.from({ length: 100 }, (_, i) => ({
      id: i,
      a: (i * 37) % 100,
      b: 0,
    }))
    const calls = new Map<number, number>()
    const configs = {
      a: (x: Item) => {
        calls.set(x.id, (calls.get(x.id) ?? 0) + 1)
        return x.a
      },
    }

    const sorted = [...items].sort(sortFunction(['a'], false, configs))

    expect(sorted.map((x) => x.id)).toEqual(
      [...items].sort((x, y) => y.a - x.a).map((x) => x.id)
    )
    expect(Math.max(...calls.values())).toEqual(1)
  })

  it('keeps multi-key ordering and ascending bypass', () => {
    const items: Item[] = [
      { id: 1, a: 1, b: 2 },
      { id: 2, a: 1, b: 5 },
      { id: 3, a: 3, b: 1 },
    ]
    const configs = { a: (x: Item) => x.a, b: (x: Item) => x.b }

    expect(
      [...items].sort(sortFunction(['a', 'b'], false, configs)).map((x) => x.id)
    ).toEqual([3, 2, 1])
    expect(
      [...items].sort(sortFunction(['b'], true, configs)).map((x) => x.id)
    ).toEqual([3, 1, 2])
    expect(
      [...items]
        .sort(sortFunction(['b'], true, configs, ['b']))
        .map((x) => x.id)
    ).toEqual([2, 1, 3])
  })
})
