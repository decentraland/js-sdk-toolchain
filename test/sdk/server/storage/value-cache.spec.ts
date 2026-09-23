import { createStorageConfig, DEFAULT_STORAGE_CONFIG } from '../../../../packages/@dcl/sdk/src/server/storage/constants'
import {
  CacheWatcher,
  createValueCache,
  ValueCache
} from '../../../../packages/@dcl/sdk/src/server/storage/value-cache'

describe('createValueCache', () => {
  it('roundtrips set/get and delete removes entries', () => {
    const cache = createValueCache(createStorageConfig())

    cache.set('a', { body: 'body-a' })
    expect(cache.get('a')).toMatchObject({ body: 'body-a' })

    cache.delete('a')
    expect(cache.get('a')).toBeUndefined()
  })

  it('evicts the oldest entry beyond cacheMaxEntries, keeping refreshed keys', () => {
    const cache = createValueCache(createStorageConfig({ cacheMaxEntries: 3 }))

    cache.set('a', { body: 'b1' })
    cache.set('b', { body: 'b2' })
    cache.set('c', { body: 'b3' })
    // Refresh 'a' so it moves to the end of the insertion order.
    cache.set('a', { body: 'b1b' })
    cache.set('d', { body: 'b4' })

    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('a')?.body).toBe('b1b')
    expect(cache.get('c')?.body).toBe('b3')
    expect(cache.get('d')?.body).toBe('b4')
  })

  it('expires entries older than cacheMaxAgeMs and removes them', () => {
    const cache = createValueCache(createStorageConfig({ cacheMaxAgeMs: 1000 }))
    const nowSpy = jest.spyOn(Date, 'now')

    try {
      nowSpy.mockReturnValue(10_000)
      cache.set('a', { body: 'body-a' })

      nowSpy.mockReturnValue(11_000)
      expect(cache.get('a')?.body).toBe('body-a')

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
      cache.set('a', { body: 'body-a' })

      // A hit just before expiry must not extend the entry's lifetime.
      nowSpy.mockReturnValue(10_999)
      expect(cache.get('a')?.body).toBe('body-a')

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
    cache.set('a', { body: 'b1' })

    expect(cache.get('a')).toBeUndefined()
  })

  it('falls back to the default bound when cacheMaxEntries is not finite', () => {
    const cache = createValueCache(createStorageConfig({ cacheMaxEntries: NaN }))

    // Eviction must not be silently disabled: the default bound (512) applies.
    for (let i = 0; i < 513; i++) {
      cache.set(`key-${i}`, { body: `b${i}` })
    }

    expect(cache.get('key-0')).toBeUndefined()
    expect(cache.get('key-1')?.body).toBe('b1')
    expect(cache.get('key-512')?.body).toBe('b512')
  })

  it('falls back to the default max age when cacheMaxAgeMs is not finite', () => {
    const cache = createValueCache(createStorageConfig({ cacheMaxAgeMs: NaN }))
    const nowSpy = jest.spyOn(Date, 'now')

    try {
      // Expiry must not be silently disabled: the default bound applies.
      nowSpy.mockReturnValue(10_000)
      cache.set('a', { body: 'b1' })

      nowSpy.mockReturnValue(10_000 + DEFAULT_STORAGE_CONFIG.cacheMaxAgeMs)
      expect(cache.get('a')?.body).toBe('b1')

      nowSpy.mockReturnValue(10_000 + DEFAULT_STORAGE_CONFIG.cacheMaxAgeMs + 1)
      expect(cache.get('a')).toBeUndefined()
    } finally {
      nowSpy.mockRestore()
    }
  })

  it('applies config mutations to an existing cache', () => {
    const config = createStorageConfig({ cacheMaxEntries: 10 })
    const cache = createValueCache(config)

    cache.set('a', { body: 'b1' })
    cache.set('b', { body: 'b2' })
    cache.set('c', { body: 'b3' })

    config.cacheMaxEntries = 2
    cache.set('d', { body: 'b4' })

    expect(cache.get('a')).toBeUndefined()
    expect(cache.get('b')).toBeUndefined()
    expect(cache.get('c')?.body).toBe('b3')
    expect(cache.get('d')?.body).toBe('b4')
  })

  describe('negative (absent) entries', () => {
    it('setAbsent stores an entry with no body', () => {
      const cache = createValueCache(createStorageConfig())

      cache.setAbsent('a')

      const entry = cache.get('a')
      expect(entry?.absent).toBe(true)
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
      cache.set('a', { body: 'b' })
      expect(cache.get('a')).toMatchObject({ body: 'b' })
      expect(cache.get('a')?.absent).toBeFalsy()

      cache.setAbsent('a')
      const entry = cache.get('a')
      expect(entry?.absent).toBe(true)
      expect(entry?.body).toBeUndefined()
    })

    it('negative entries count toward cacheMaxEntries eviction', () => {
      const cache = createValueCache(createStorageConfig({ cacheMaxEntries: 2 }))

      cache.set('a', { body: 'b1' })
      cache.setAbsent('b')
      cache.set('c', { body: 'b3' })

      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')?.absent).toBe(true)
      expect(cache.get('c')?.body).toBe('b3')
    })

    it('delete removes negative entries', () => {
      const cache = createValueCache(createStorageConfig())

      cache.setAbsent('a')
      cache.delete('a')

      expect(cache.get('a')).toBeUndefined()
    })
  })
  describe('when a bound is set to Infinity', () => {
    let cache: ValueCache
    let now: jest.SpyInstance<number, []>

    beforeEach(() => {
      now = jest.spyOn(Date, 'now').mockReturnValue(1_000)
      cache = createValueCache(createStorageConfig({ cacheMaxAgeMs: Infinity, cacheMaxEntries: Infinity }))
      for (let i = 0; i < 600; i++) cache.set(`k${i}`, { body: `b${i}` })
    })

    afterEach(() => {
      now.mockRestore()
    })

    it('should keep every entry instead of evicting past the default bound', () => {
      expect(cache.get('k0')?.body).toBe('b0')
    })

    it('should never expire an entry', () => {
      now.mockReturnValue(1_000 + 365 * 24 * 3_600_000)

      expect(cache.get('k599')?.body).toBe('b599')
    })
  })

  describe('when a watcher is started', () => {
    let cache: ValueCache
    let watcher: CacheWatcher

    beforeEach(() => {
      cache = createValueCache(createStorageConfig())
      cache.set('before', { body: 'b0' })
      watcher = cache.watch()
    })

    afterEach(() => {
      watcher.stop()
    })

    it('should not report a key mutated before it started', () => {
      expect(watcher.mutated('before')).toBe(false)
    })

    it('should report a key set after it started', () => {
      cache.set('a', { body: 'b1' })

      expect(watcher.mutated('a')).toBe(true)
    })

    it('should report a key marked absent after it started', () => {
      cache.setAbsent('a')

      expect(watcher.mutated('a')).toBe(true)
    })

    it('should report a key deleted after it started, even one the cache never held', () => {
      cache.delete('a')

      expect(watcher.mutated('a')).toBe(true)
    })

    it('should not report a key nobody touched', () => {
      cache.set('a', { body: 'b1' })

      expect(watcher.mutated('other')).toBe(false)
    })

    describe('and it is stopped', () => {
      beforeEach(() => {
        cache.set('while-watching', { body: 'b1' })
        watcher.stop()
        cache.set('after-stop', { body: 'b2' })
      })

      it('should keep what it recorded while watching', () => {
        expect(watcher.mutated('while-watching')).toBe(true)
      })

      it('should not record mutations made after it stopped', () => {
        expect(watcher.mutated('after-stop')).toBe(false)
      })
    })

    describe('and a second watcher starts later', () => {
      let later: CacheWatcher

      beforeEach(() => {
        cache.set('first-only', { body: 'b1' })
        later = cache.watch()
        cache.set('both', { body: 'b2' })
      })

      afterEach(() => {
        later.stop()
      })

      it('should record only what happened after its own start', () => {
        expect([later.mutated('first-only'), later.mutated('both')]).toEqual([false, true])
      })
    })
  })
})
