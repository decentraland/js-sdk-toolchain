import { getRandomMnemonic, nouns, adjectives } from './utils'

describe('getRandomMnemonic', () => {
  it('should return a string with a random adjective and noun', () => {
    const mnemonic = getRandomMnemonic()
    const [adjective, noun] = mnemonic.split('-')

    expect(adjectives).toContain(adjective)
    expect(nouns).toContain(noun)
  })

  it('should return a valid mnemonic', () => {
    const mnemonic = getRandomMnemonic()
    const parts = mnemonic.split('-')

    expect(parts.length).toBe(2)
    expect(adjectives).toContain(parts[0])
    expect(nouns).toContain(parts[1])
  })
})
