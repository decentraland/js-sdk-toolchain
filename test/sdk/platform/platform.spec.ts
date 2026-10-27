const mockGetExplorerInformation = jest.fn()

jest.mock('~system/Runtime', () => ({
  getExplorerInformation: mockGetExplorerInformation
}))

const mockSubscribe = jest.fn()

jest.mock('~system/EngineApi', () => ({
  subscribe: mockSubscribe
}))

function mockPlatform(platform: string) {
  mockGetExplorerInformation.mockResolvedValue({
    platform,
    agent: 'test-agent',
    configurations: {}
  })
}

/** Flush pending microtasks so module-level promises settle. */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('platform detection', () => {
  beforeEach(() => {
    jest.resetModules()
    mockGetExplorerInformation.mockReset()
    mockSubscribe.mockReset().mockResolvedValue({})
  })

  async function loadPlatformModule() {
    const mod = await import('../../../packages/@dcl/sdk/src/platform/index')
    await flushMicrotasks()
    return mod
  }

  it.each`
    fnName         | platform     | expected
    ${'isMobile'}  | ${'mobile'}  | ${true}
    ${'isMobile'}  | ${'desktop'} | ${false}
    ${'isDesktop'} | ${'desktop'} | ${true}
    ${'isDesktop'} | ${'mobile'}  | ${false}
    ${'isWeb'}     | ${'web'}     | ${true}
    ${'isWeb'}     | ${'desktop'} | ${false}
  `('$fnName() returns $expected for platform "$platform"', async ({ fnName, platform, expected }) => {
    mockPlatform(platform)
    const mod = await loadPlatformModule()
    expect((mod as any)[fnName]()).toBe(expected)
  })

  it('getPlatform() returns the platform string', async () => {
    mockPlatform('mobile')
    const { getPlatform } = await loadPlatformModule()
    expect(getPlatform()).toBe('mobile')
  })

  it('returns null and false before initialization completes', async () => {
    mockGetExplorerInformation.mockReturnValue(new Promise(() => {}))
    const { getPlatform, isMobile } = await loadPlatformModule()
    expect(getPlatform()).toBeNull()
    expect(isMobile()).toBe(false)
  })

  it('normalizes mixed-case platform values to lowercase', async () => {
    mockPlatform('Desktop')
    const { getPlatform, isDesktop } = await loadPlatformModule()
    expect(getPlatform()).toBe('desktop')
    expect(isDesktop()).toBe(true)
  })

  it('getPlatform() returns null for unknown platform values', async () => {
    mockPlatform('unknown-platform')
    const { getPlatform } = await loadPlatformModule()
    expect(getPlatform()).toBeNull()
  })

  it('getPlatform() returns null when getExplorerInformation rejects', async () => {
    mockGetExplorerInformation.mockRejectedValue(new Error('runtime unavailable'))
    const { getPlatform } = await loadPlatformModule()
    await flushMicrotasks()
    expect(getPlatform()).toBeNull()
  })

  describe('getPlayerLanguage()', () => {
    function mockLocale(configurations?: Record<string, string>) {
      mockGetExplorerInformation.mockResolvedValue({ platform: 'desktop', agent: 'test-agent', configurations })
    }

    async function loadLanguageEvents() {
      return import('../../../packages/@dcl/sdk/src/internal/language-events')
    }

    it.each`
      locale     | expected
      ${'es'}    | ${'es'}
      ${'pt-BR'} | ${'pt-BR'}
      ${'pt_BR'} | ${'pt-BR'}
      ${' fr '}  | ${'fr'}
      ${''}      | ${'en'}
      ${'???'}   | ${'en'}
    `('returns "$expected" for configurations.locale "$locale"', async ({ locale, expected }) => {
      mockLocale({ locale })
      const { getPlayerLanguage } = await loadPlatformModule()
      expect(getPlayerLanguage()).toBe(expected)
    })

    it('returns "en" when the client does not report a locale', async () => {
      mockLocale({})
      const { getPlayerLanguage } = await loadPlatformModule()
      expect(getPlayerLanguage()).toBe('en')
    })

    it('returns "en" when configurations is missing', async () => {
      mockLocale(undefined)
      const { getPlayerLanguage } = await loadPlatformModule()
      expect(getPlayerLanguage()).toBe('en')
    })

    it('returns "en" when getExplorerInformation rejects', async () => {
      mockGetExplorerInformation.mockRejectedValue(new Error('runtime unavailable'))
      const { getPlayerLanguage } = await loadPlatformModule()
      expect(getPlayerLanguage()).toBe('en')
    })

    it('still reads the locale when the platform is unknown', async () => {
      mockGetExplorerInformation.mockResolvedValue({ platform: '???', agent: 'a', configurations: { locale: 'es' } })
      const { getPlayerLanguage } = await loadPlatformModule()
      expect(getPlayerLanguage()).toBe('es')
    })

    it('subscribes to the localeChanged event', async () => {
      mockLocale({})
      await loadPlatformModule()
      expect(mockSubscribe).toHaveBeenCalledWith({ eventId: 'localeChanged' })
    })

    it('updates and notifies once when the locale changes mid-session', async () => {
      mockLocale({ locale: 'en' })
      const { getPlayerLanguage, onPlayerLanguageChanged } = await loadPlatformModule()
      const { localeChangedEvents } = await loadLanguageEvents()
      const observer = jest.fn()
      onPlayerLanguageChanged.add(observer)

      localeChangedEvents.notifyObservers({ locale: 'pt_BR' })
      localeChangedEvents.notifyObservers({ locale: 'pt-BR' })

      expect(getPlayerLanguage()).toBe('pt-BR')
      expect(observer).toHaveBeenCalledTimes(1)
      expect(observer.mock.calls[0][0]).toEqual({ language: 'pt-BR' })
    })

    it('falls back to "en" when a mid-session locale is invalid', async () => {
      mockLocale({ locale: 'es' })
      const { getPlayerLanguage } = await loadPlatformModule()
      const { localeChangedEvents } = await loadLanguageEvents()
      localeChangedEvents.notifyObservers({ locale: '' })
      expect(getPlayerLanguage()).toBe('en')
    })

    it('keeps a mid-session change that arrives before the explorer responds', async () => {
      let resolveInfo: (value: unknown) => void = () => {}
      mockGetExplorerInformation.mockReturnValue(new Promise((resolve) => (resolveInfo = resolve)))
      const { getPlayerLanguage } = await loadPlatformModule()
      const { localeChangedEvents } = await loadLanguageEvents()

      localeChangedEvents.notifyObservers({ locale: 'es' })
      resolveInfo({ platform: 'desktop', agent: 'a', configurations: { locale: 'fr' } })
      await flushMicrotasks()

      expect(getPlayerLanguage()).toBe('es')
    })

    it('logs when the subscription fails', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockSubscribe.mockRejectedValue(new Error('no events'))
      mockLocale({})
      await loadPlatformModule()
      expect(consoleError).toHaveBeenCalled()
      consoleError.mockRestore()
    })
  })
})
