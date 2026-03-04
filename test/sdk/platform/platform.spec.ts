const mockGetExplorerInformation = jest.fn()

jest.mock('~system/Runtime', () => ({
  getExplorerInformation: mockGetExplorerInformation
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
  })

  async function loadPlatformModule() {
    const mod = await import('../../../packages/@dcl/sdk/src/platform/index')
    await flushMicrotasks()
    return mod
  }

  it.each`
    fnName       | platform     | expected
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
})
