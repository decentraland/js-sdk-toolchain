// Mock for ~system/Runtime that can be controlled per test
let mockPlatform = 'web' // Default to non-desktop

const Runtime = {
  getExplorerInformation: jest.fn().mockImplementation(async () => ({
    platform: mockPlatform,
    agent: 'test-agent',
    configurations: {}
  })),
  getRealm: jest.fn().mockResolvedValue({
    realmInfo: {
      baseUrl: 'http://localhost',
      realmName: 'localhost',
      networkId: 1,
      commsAdapter: 'offline',
      isPreview: true
    }
  }),
  getWorldTime: jest.fn().mockResolvedValue({ seconds: Date.now() / 1000 }),
  readFile: jest.fn().mockResolvedValue({ content: new Uint8Array(), hash: '' }),
  getSceneInformation: jest.fn().mockResolvedValue({
    urn: '',
    content: [],
    metadataJson: '{}',
    baseUrl: ''
  })
}

// Helper to set platform for tests
Runtime.setPlatform = (platform: string) => {
  mockPlatform = platform
  Runtime.getExplorerInformation.mockResolvedValue({
    platform: mockPlatform,
    agent: 'test-agent',
    configurations: {}
  })
}

// Helper to reset to default
Runtime.resetPlatform = () => {
  Runtime.setPlatform('web')
}

module.exports = Runtime

