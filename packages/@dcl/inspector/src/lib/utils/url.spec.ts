import { isValidHttpsUrl } from './url'

describe('isValidHttpsUrl', () => {
  it('returns true for a valid HTTPS URL', () => {
    const result = isValidHttpsUrl('https://example.com')
    expect(result).toBe(true)
  })

  it('returns true for a valid HTTPS URL with www', () => {
    const result = isValidHttpsUrl('https://www.example.com')
    expect(result).toBe(true)
  })

  it('returns false for an invalid URL', () => {
    const result = isValidHttpsUrl('invalid-url')
    expect(result).toBe(false)
  })

  it('returns false for a non-HTTPS URL', () => {
    const result = isValidHttpsUrl('http://example.com')
    expect(result).toBe(false)
  })

  it('returns false for an incomplete URL', () => {
    const result = isValidHttpsUrl('https://example')
    expect(result).toBe(false)
  })
})
