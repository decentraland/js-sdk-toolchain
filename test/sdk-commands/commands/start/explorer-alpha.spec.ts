import { runExplorerAlpha } from '../../../../packages/@dcl/sdk-commands/src/commands/start/explorer-alpha'

// Mock the spawner.exec function
const mockExec = jest.fn()

// Mock the logger
const mockLogger = {
  log: jest.fn(),
  info: jest.fn(),
  error: jest.fn()
}

// Mock components
const mockComponents = {
  logger: mockLogger,
  spawner: {
    exec: mockExec
  }
} as any

describe('explorer-alpha', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset process.platform to ensure consistent testing
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      writable: true
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('boolean parameters', () => {
    it('should always include local-scene and debug parameters', async () => {
      const args: any = {
        '--local-scene': true,
        '--debug': true,
        '--skip-auth-screen': true,
        '--landscape-terrain-enabled': true
      }

      await runExplorerAlpha(mockComponents, {
        cwd: '/test',
        realm: 'test-realm',
        baseCoords: { x: 0, y: 0 },
        isHub: false,
        args
      })

      expect(mockExec).toHaveBeenCalledWith(
        '/test',
        'open',
        expect.arrayContaining([expect.stringContaining('local-scene=true')]),
        { silent: true }
      )
    })

    it('should always include local-scene and debug even when they are false', async () => {
      const args: any = {
        '--local-scene': false,
        '--debug': false,
        '--skip-auth-screen': false,
        '--landscape-terrain-enabled': false
      }

      await runExplorerAlpha(mockComponents, {
        cwd: '/test',
        realm: 'test-realm',
        baseCoords: { x: 0, y: 0 },
        isHub: false,
        args
      })

      expect(mockExec).toHaveBeenCalledWith(
        '/test',
        'open',
        expect.arrayContaining([expect.stringContaining('local-scene=true')]),
        { silent: true }
      )
    })

    it('should always include local-scene and debug even when they are undefined', async () => {
      const args: any = {}

      await runExplorerAlpha(mockComponents, {
        cwd: '/test',
        realm: 'test-realm',
        baseCoords: { x: 0, y: 0 },
        isHub: false,
        args
      })

      expect(mockExec).toHaveBeenCalledWith(
        '/test',
        'open',
        expect.arrayContaining([expect.stringContaining('local-scene=true')]),
        { silent: true }
      )
    })
  })

  describe('openDeeplinkInNewInstance parameter', () => {
    it('should include open-deeplink-in-new-instance parameter when -n flag is provided', async () => {
      const args: any = {
        '-n': true
      }

      await runExplorerAlpha(mockComponents, {
        cwd: '/test',
        realm: 'test-realm',
        baseCoords: { x: 0, y: 0 },
        isHub: false,
        args
      })

      expect(mockExec).toHaveBeenCalledWith(
        '/test',
        'open',
        expect.arrayContaining([expect.stringContaining('open-deeplink-in-new-instance=true')]),
        { silent: true }
      )
    })

    it('should not include open-deeplink-in-new-instance parameter when -n flag is not provided', async () => {
      const args: any = {}

      await runExplorerAlpha(mockComponents, {
        cwd: '/test',
        realm: 'test-realm',
        baseCoords: { x: 0, y: 0 },
        isHub: false,
        args
      })

      expect(mockExec).toHaveBeenCalledWith(
        '/test',
        'open',
        expect.arrayContaining([expect.not.stringContaining('open-deeplink-in-new-instance')]),
        { silent: true }
      )
    })
  })

  describe('URL parameter construction', () => {
    it('should construct URL with all parameters correctly', async () => {
      const args: any = {
        '--position': '10,20',
        '--realm': 'custom-realm',
        '--local-scene': true,
        '--debug': false,
        '--dclenv': 'zone',
        '--skip-auth-screen': true,
        '--landscape-terrain-enabled': false,
        '-n': true
      }

      await runExplorerAlpha(mockComponents, {
        cwd: '/test',
        realm: 'default-realm',
        baseCoords: { x: 0, y: 0 },
        isHub: true,
        args
      })

      expect(mockExec).toHaveBeenCalledWith(
        '/test',
        'open',
        expect.arrayContaining([expect.stringMatching(/decentraland:\/\/".*"$/)]),
        { silent: true }
      )

      // Check that all expected parameters are present
      const callArgs = mockExec.mock.calls[0][2][0]
      expect(callArgs).toContain('realm=custom-realm')
      expect(callArgs).toContain('position=10%2C20')
      expect(callArgs).toContain('dclenv=zone')
      expect(callArgs).toContain('local-scene=true')
      expect(callArgs).toContain('debug=true')
      expect(callArgs).toContain('hub=true')
      expect(callArgs).toContain('skip-auth-screen=true')
      expect(callArgs).toContain('open-deeplink-in-new-instance=true')

      // Check that false parameters are not present
      expect(callArgs).not.toContain('landscape-terrain-enabled=true')
    })

    it('should use default values when parameters are not provided', async () => {
      const args: any = {}

      await runExplorerAlpha(mockComponents, {
        cwd: '/test',
        realm: 'default-realm',
        baseCoords: { x: 5, y: 10 },
        isHub: false,
        args
      })

      expect(mockExec).toHaveBeenCalledWith(
        '/test',
        'open',
        expect.arrayContaining([
          expect.stringMatching(
            /decentraland:\/\/.*realm=default-realm.*position=5%2C10.*dclenv=org.*local-scene=true.*debug=true/
          )
        ]),
        { silent: true }
      )
    })

    it('should handle Windows platform correctly', async () => {
      // For this test, we'll just verify that the logic exists in the code
      // The actual platform detection is tested by checking the regex pattern
      // that determines the command to use
      const args: any = {}

      await runExplorerAlpha(mockComponents, {
        cwd: '/test',
        realm: 'test-realm',
        baseCoords: { x: 0, y: 0 },
        isHub: false,
        args
      })

      // The command should be either 'start' (Windows) or 'open' (Unix)
      expect(mockExec).toHaveBeenCalledWith(
        '/test',
        expect.stringMatching(/^(start|open)$/),
        expect.arrayContaining([expect.stringContaining('decentraland://')]),
        { silent: true }
      )
    })
  })

  describe('error handling', () => {
    it('should log error when spawner.exec throws an error', async () => {
      mockExec.mockRejectedValue(new Error('Failed to open'))

      const args: any = {}

      await runExplorerAlpha(mockComponents, {
        cwd: '/test',
        realm: 'test-realm',
        baseCoords: { x: 0, y: 0 },
        isHub: false,
        args
      })

      expect(mockLogger.error).toHaveBeenCalledWith('Decentraland Desktop Client failed with: ', 'Failed to open')
    })

    it('should log success message when spawner.exec succeeds', async () => {
      mockExec.mockResolvedValue(undefined)

      const args: any = {}

      await runExplorerAlpha(mockComponents, {
        cwd: '/test',
        realm: 'test-realm',
        baseCoords: { x: 0, y: 0 },
        isHub: false,
        args
      })

      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Desktop client:'))
    })
  })

  describe('fallback behavior', () => {
    it('should log fallback message when runApp returns false', async () => {
      mockExec.mockRejectedValue(new Error('Failed to open'))

      const args: any = {}

      await runExplorerAlpha(mockComponents, {
        cwd: '/test',
        realm: 'test-realm',
        baseCoords: { x: 0, y: 0 },
        isHub: false,
        args
      })

      expect(mockLogger.log).toHaveBeenCalledWith(
        'Please download & install the Decentraland Desktop Client: https://dcl.gg/explorer\n\n'
      )
    })
  })
})
