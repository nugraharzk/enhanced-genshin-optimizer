import { verdictFor } from './constants'

describe('verdictFor', () => {
  it('keeps at and above the keep threshold', () => {
    expect(verdictFor(12)).toEqual('keep')
    expect(verdictFor(40)).toEqual('keep')
  })
  it('marks maybes between the thresholds', () => {
    expect(verdictFor(11.99)).toEqual('maybe')
    expect(verdictFor(6)).toEqual('maybe')
  })
  it('trashes below the maybe threshold', () => {
    expect(verdictFor(5.99)).toEqual('trash')
    expect(verdictFor(0)).toEqual('trash')
  })
})
