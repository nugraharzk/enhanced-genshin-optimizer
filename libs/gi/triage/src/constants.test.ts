import { verdictFor } from './constants'

describe('verdictFor', () => {
  it('keeps at and above the keep threshold', () => {
    expect(verdictFor(34)).toEqual('keep')
    expect(verdictFor(80)).toEqual('keep')
  })
  it('marks maybes between the thresholds', () => {
    expect(verdictFor(33.99)).toEqual('maybe')
    expect(verdictFor(16)).toEqual('maybe')
  })
  it('trashes below the maybe threshold', () => {
    expect(verdictFor(15.99)).toEqual('trash')
    expect(verdictFor(0)).toEqual('trash')
  })
})
