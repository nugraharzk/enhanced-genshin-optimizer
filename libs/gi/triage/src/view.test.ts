import type { TriageResult } from './types'
import { applyTriageView } from './view'

const results = new Map<string, TriageResult>([
  [
    'a',
    { verdict: 'trash', value: 1, owners: [], future: false, locked: false },
  ],
  [
    'b',
    { verdict: 'keep', value: 30, owners: [], future: false, locked: false },
  ],
])

describe('applyTriageView', () => {
  it('filters by verdict and sorts by value', () => {
    expect(applyTriageView(['a', 'b'], results, 'keep')).toEqual(['b'])
    expect(applyTriageView(['a', 'b'], results, 'all')).toEqual(['b', 'a'])
  })

  it('drops artifacts with no result', () => {
    expect(applyTriageView(['a', 'zzz'], new Map(), 'all')).toEqual([])
  })
})
