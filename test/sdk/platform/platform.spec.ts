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

describe('platform detection', () => {
  beforeEach(() => {
    jest.resetModules()
    mockGetExplorerInformation.mockReset()
  })

  async function loadPlatformModule() {
    const mod = await import('../../../packages/@dcl/sdk/src/platform/index')
    // Allow the promise from getExplorerInformation to resolve
    await new Promise((r) => setTimeout(r, 0))
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
})
