import { withPosition } from '../../../../packages/@dcl/sdk-commands/src/commands/storage/shared'

describe('storage shared › withPosition', () => {
  it('appends the base parcel as a position query param with a literal comma', () => {
    expect(withPosition('https://storage.decentraland.org/values/highScore', '60,-9')).toBe(
      'https://storage.decentraland.org/values/highScore?position=60,-9'
    )
  })

  it('uses & as separator when the url already has a query string', () => {
    expect(withPosition('https://storage.decentraland.org/values?prefix=player-', '10,20')).toBe(
      'https://storage.decentraland.org/values?prefix=player-&position=10,20'
    )
  })
})
