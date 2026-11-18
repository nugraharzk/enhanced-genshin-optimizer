import { triageLabel } from './label'

describe('triageLabel', () => {
  it('names the top owners', () => {
    expect(
      triageLabel({
        verdict: 'keep',
        value: 26.8,
        owners: [
          { key: 'AratakiItto', value: 26.8 },
          { key: 'Noelle', value: 21 },
        ],
        future: false,
        locked: false,
      })
    ).toEqual('KEEP 27% · AratakiItto, Noelle')
  })

  it('labels the safety net', () => {
    expect(
      triageLabel({
        verdict: 'maybe',
        value: 0,
        owners: [],
        future: true,
        locked: false,
      })
    ).toEqual('MAYBE · future')
  })

  it('omits the value when nobody is weighted for it', () => {
    expect(
      triageLabel({
        verdict: 'trash',
        value: 3.2,
        owners: [],
        future: false,
        locked: false,
      })
    ).toEqual('TRASH')
  })
})
