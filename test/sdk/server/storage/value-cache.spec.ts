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

    cache.set('a', { print: 'print-a', body: 'body-a' })
    expect(cache.get('a')).toMatchObject({ print: 'print-a', body: 'body-a' })

    cache.delete('a')
    expect(cache.get('a')).toBeUndefined()
  })

  it('evicts the oldest entry beyond cacheMaxEntries, keeping refreshed keys', () => {
    const cache = createValueCache(createStorageConfig({ cacheMaxEntries: 3 }))

    cache.set('a', { print: '1', body: 'b1' })
    cache.set('b', { print: '2', body: 'b2' })
    cache.set('c', { print: '3', body: 'b3' })
    // Refresh 'a' so it moves to the end of the insertion order.
    cache.set('a', { print: '1b', body: 'b1b' })
    cache.set('d', { print: '4', body: 'b4' })

    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')?.print).toBe('1b')
    expect(cache.get('c')?.print).toBe('3')
    expect(cache.get('d')?.print).toBe('4')
  })

  it('expires entries older than cacheMaxAgeMs and removes them', () => {
    const cache = createValueCache(createStorageConfig({ cacheMaxAgeMs: 1000 }))
    const nowSpy = jest.spyOn(Date, 'now')

    try {
      nowSpy.mockReturnValue(10_000)
      cache.set('a', { print: 'print-a', body: 'body-a' })

      nowSpy.mockReturnValue(11_000)
      expect(cache.get('a')?.print).toBe('print-a')

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
      cache.set('a', { print: 'print-a', body: 'body-a' })

      // A hit just before expiry must not extend the entry's lifetime.
      nowSpy.mockReturnValue(10_999)
      expect(cache.get('a')?.print).toBe('print-a')

      nowSpy.mockReturnValue(11_001)
      expect(cache.get('a')).toBeUndefined()
    } finally {
      nowSpy.mockRestore()
    }
  })

  it('treats a negative cacheMaxEntries as 0 instead of looping forever', () => {
    const cache = createValueCache(createStorageConfig({ cacheMaxEntries: -1 }))

    // Must terminate (a negative bound can never be reached by an empty map)
    // and behave as a disabled cache.
    cache.set('a', { print: '1', body: 'b1' })

    expect(cache.get('a')).toBeUndefined()
  })

  it('falls back to the default bound when cacheMaxEntries is not finite', () => {
    const cache = createValueCache(createStorageConfig({ cacheMaxEntries: NaN }))

    // Eviction must not be silently disabled: the default bound (512) applies.
    for (let i = 0; i < 513; i++) {
      cache.set(`key-${i}`, { print: `${i}`, body: `b${i}` })
    }

    expect(cache.get('key-0')).toBeUndefined()
    expect(cache.get('key-1')?.print).toBe('1')
    expect(cache.get('key-512')?.print).toBe('512')
  })

  it('applies config mutations to an existing cache', () => {
    const config = createStorageConfig({ cacheMaxEntries: 10 })
    const cache = createValueCache(config)

    cache.set('a', { print: '1', body: 'b1' })
    cache.set('b', { print: '2', body: 'b2' })
    cache.set('c', { print: '3', body: 'b3' })

    config.cacheMaxEntries = 2
    cache.set('d', { print: '4', body: 'b4' })

    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')?.print).toBe('3')
    expect(cache.get('d')?.print).toBe('4')
  })

  describe('negative (absent) entries', () => {
    it('setAbsent stores an entry with no print or body', () => {
      const cache = createValueCache(createStorageConfig())

      cache.setAbsent('a')

      const entry = cache.get('a')
      expect(entry?.absent).toBe(true)
      expect(entry?.print).toBeUndefined()
      expect(entry?.body).toBeUndefined()
    })

    it('negative entries expire past cacheMaxAgeMs', () => {
      const cache = createValueCache(createStorageConfig({ cacheMaxAgeMs: 1000 }))
      const nowSpy = jest.spyOn(Date, 'now')

      try {
        nowSpy.mockReturnValue(10_000)
        cache.setAbsent('a')

        nowSpy.mockReturnValue(11_000)
        expect(cache.get('a')?.absent).toBe(true)

        nowSpy.mockReturnValue(11_001)
        expect(cache.get('a')).toBeUndefined()
      } finally {
        nowSpy.mockRestore()
      }
    })

    it('set replaces a negative entry and setAbsent replaces a value entry', () => {
      const cache = createValueCache(createStorageConfig())

      cache.setAbsent('a')
      cache.set('a', { print: 'p', body: 'b' })
      expect(cache.get('a')).toMatchObject({ print: 'p', body: 'b' })
      expect(cache.get('a')?.absent).toBeFalsy()

      cache.setAbsent('a')
      const entry = cache.get('a')
      expect(entry?.absent).toBe(true)
      expect(entry?.print).toBeUndefined()
    })

    it('negative entries count toward cacheMaxEntries eviction', () => {
      const cache = createValueCache(createStorageConfig({ cacheMaxEntries: 2 }))

      cache.set('a', { print: '1', body: 'b1' })
      cache.setAbsent('b')
      cache.set('c', { print: '3', body: 'b3' })

      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')?.absent).toBe(true)
      expect(cache.get('c')?.print).toBe('3')
    })

    it('delete removes negative entries', () => {
      const cache = createValueCache(createStorageConfig())

      cache.setAbsent('a')
      cache.delete('a')

      expect(cache.get('a')).toBeUndefined()
    })
  })
})
