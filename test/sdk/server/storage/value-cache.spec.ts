import { createStorageConfig } from '../../../../packages/@dcl/sdk/src/server/storage/constants'
import { createValueCache, fingerprint, fnv1a } from '../../../../packages/@dcl/sdk/src/server/storage/value-cache'

describe('fnv1a / fingerprint', () => {
  it('is deterministic and differs for different inputs', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'))
    expect(fnv1a('hello')).not.toBe(fnv1a('hellp'))
  })

  it('fingerprint includes the serialized length', () => {
    expect(fingerprint('abc')).toBe(`${fnv1a('abc').toString(16)}:3`)
  })
})

describe('createValueCache', () => {
  it('roundtrips set/get and delete removes entries', () => {
    const cache = createValueCache(createStorageConfig())

    cache.set('a', 'print-a')
    expect(cache.get('a')).toBe('print-a')

    cache.delete('a')
    expect(cache.get('a')).toBeUndefined()
  })

  it('evicts the oldest entry beyond cacheMaxEntries, keeping refreshed keys', () => {
    const cache = createValueCache(createStorageConfig({ cacheMaxEntries: 3 }))

    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')
    // Refresh 'a' so it moves to the end of the insertion order.
    cache.set('a', '1b')
    cache.set('d', '4')

    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')).toBe('1b')
    expect(cache.get('c')).toBe('3')
    expect(cache.get('d')).toBe('4')
  })

  it('expires entries older than cacheMaxAgeMs and removes them', () => {
    const cache = createValueCache(createStorageConfig({ cacheMaxAgeMs: 1000 }))
    const nowSpy = jest.spyOn(Date, 'now')

    try {
      nowSpy.mockReturnValue(10_000)
      cache.set('a', 'print-a')

      nowSpy.mockReturnValue(11_000)
      expect(cache.get('a')).toBe('print-a')

      nowSpy.mockReturnValue(11_001)
      expect(cache.get('a')).toBeUndefined()

      // The expired entry was physically removed, not just hidden.
      nowSpy.mockReturnValue(10_500)
      expect(cache.get('a')).toBeUndefined()
    } finally {
      nowSpy.mockRestore()
    }
  })

  it('does not refresh storedAt on cache hits', () => {
    const cache = createValueCache(createStorageConfig({ cacheMaxAgeMs: 1000 }))
    const nowSpy = jest.spyOn(Date, 'now')

    try {
      nowSpy.mockReturnValue(10_000)
      cache.set('a', 'print-a')

      // A hit just before expiry must not extend the entry's lifetime.
      nowSpy.mockReturnValue(10_999)
      expect(cache.get('a')).toBe('print-a')

      nowSpy.mockReturnValue(11_001)
      expect(cache.get('a')).toBeUndefined()
    } finally {
      nowSpy.mockRestore()
    }
  })

  it('applies config mutations to an existing cache', () => {
    const config = createStorageConfig({ cacheMaxEntries: 10 })
    const cache = createValueCache(config)

    cache.set('a', '1')
    cache.set('b', '2')
    cache.set('c', '3')

    config.cacheMaxEntries = 2
    cache.set('d', '4')

    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')).toBe('3')
    expect(cache.get('d')).toBe('4')
  })
})
