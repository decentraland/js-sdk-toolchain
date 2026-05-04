import * as worldPermissions from '../../../../packages/@dcl/sdk-commands/src/commands/world-permissions/index'
import * as utils from '../../../../packages/@dcl/sdk-commands/src/commands/world-permissions/utils'
import { initComponents } from '../../../../packages/@dcl/sdk-commands/src/components'
import { initLanguage, Language } from '../../../../packages/@dcl/sdk-commands/src/logic/lang'

const VALID_ADDRESS_1 = '0xc0ffee254729296a45a3885639AC7E10F9d54979'
const VALID_ADDRESS_2 = '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF'
const WORLD_NAME = 'myworld.dcl.eth'

beforeAll(async () => {
  await initLanguage(Language.EN)
})

describe('world-permissions command', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  describe('validation', () => {
    it('should throw if --world is not provided', async () => {
      const components = await initComponents()
      const executeSignedRequest = jest.spyOn(utils, 'executeSignedRequest')

      await expect(() =>
        worldPermissions.main({ args: { _: [], '--address': [VALID_ADDRESS_1] }, components })
      ).rejects.toThrow('World name is required')

      expect(executeSignedRequest).not.toBeCalled()
    })

    it('should throw if --address is not provided', async () => {
      const components = await initComponents()
      const executeSignedRequest = jest.spyOn(utils, 'executeSignedRequest')

      await expect(() =>
        worldPermissions.main({ args: { _: [], '--world': WORLD_NAME }, components })
      ).rejects.toThrow('At least one address is required')

      expect(executeSignedRequest).not.toBeCalled()
    })

    it('should throw if --address is an empty array', async () => {
      const components = await initComponents()
      const executeSignedRequest = jest.spyOn(utils, 'executeSignedRequest')

      await expect(() =>
        worldPermissions.main({ args: { _: [], '--world': WORLD_NAME, '--address': [] }, components })
      ).rejects.toThrow('At least one address is required')

      expect(executeSignedRequest).not.toBeCalled()
    })

    it('should throw if any address is not a valid EVM address', async () => {
      const components = await initComponents()
      const executeSignedRequest = jest.spyOn(utils, 'executeSignedRequest')

      await expect(() =>
        worldPermissions.main({
          args: { _: [], '--world': WORLD_NAME, '--address': ['0xinvalid'] },
          components
        })
      ).rejects.toThrow('Invalid Ethereum address: 0xinvalid')

      expect(executeSignedRequest).not.toBeCalled()
    })

    it('should throw if a parcel has invalid format', async () => {
      const components = await initComponents()
      const executeSignedRequest = jest.spyOn(utils, 'executeSignedRequest')

      await expect(() =>
        worldPermissions.main({
          args: {
            _: [],
            '--world': WORLD_NAME,
            '--address': [VALID_ADDRESS_1],
            '--parcels': '0,0 badparcel 1,0'
          },
          components
        })
      ).rejects.toThrow('Invalid parcel format: "badparcel"')

      expect(executeSignedRequest).not.toBeCalled()
    })

    it('should throw if a parcel is missing a coordinate', async () => {
      const components = await initComponents()
      const executeSignedRequest = jest.spyOn(utils, 'executeSignedRequest')

      await expect(() =>
        worldPermissions.main({
          args: {
            _: [],
            '--world': WORLD_NAME,
            '--address': [VALID_ADDRESS_1],
            '--parcels': '0'
          },
          components
        })
      ).rejects.toThrow('Invalid parcel format: "0"')

      expect(executeSignedRequest).not.toBeCalled()
    })
  })

  describe('world-wide permissions (no --parcels)', () => {
    it('should fetch existing permissions and call executeSignedRequest with merged wallets', async () => {
      const components = await initComponents()
      const existingWallet = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

      const fetchPermissions = jest
        .spyOn(utils, 'fetchWorldDeploymentPermissions')
        .mockResolvedValueOnce({ type: 'allow-list', wallets: [existingWallet] })

      const executeSignedRequest = jest.spyOn(utils, 'executeSignedRequest').mockResolvedValueOnce({})

      await worldPermissions.main({
        args: { _: [], '--world': WORLD_NAME, '--address': [VALID_ADDRESS_1] },
        components
      })

      expect(fetchPermissions).toBeCalledWith(
        components.fetch,
        'https://worlds-content-server.decentraland.org',
        WORLD_NAME
      )

      expect(executeSignedRequest).toBeCalledWith(
        components,
        { linkerPort: undefined, isHttps: false, openBrowser: true },
        {
          url: `https://worlds-content-server.decentraland.org/world/${encodeURIComponent(WORLD_NAME)}/permissions/deployment`,
          method: 'POST',
          metadata: {
            type: 'allow-list',
            wallets: [existingWallet, VALID_ADDRESS_1.toLowerCase()]
          }
        },
        expect.any(Function)
      )
    })

    it('should support multiple addresses in a single signing round', async () => {
      const components = await initComponents()

      jest
        .spyOn(utils, 'fetchWorldDeploymentPermissions')
        .mockResolvedValueOnce({ type: 'allow-list', wallets: [] })

      const executeSignedRequest = jest.spyOn(utils, 'executeSignedRequest').mockResolvedValueOnce({})

      await worldPermissions.main({
        args: { _: [], '--world': WORLD_NAME, '--address': [VALID_ADDRESS_1, VALID_ADDRESS_2] },
        components
      })

      expect(executeSignedRequest).toBeCalledTimes(1)
      expect(executeSignedRequest).toBeCalledWith(
        components,
        expect.any(Object),
        expect.objectContaining({
          metadata: {
            type: 'allow-list',
            wallets: expect.arrayContaining([VALID_ADDRESS_1.toLowerCase(), VALID_ADDRESS_2.toLowerCase()])
          }
        }),
        expect.any(Function)
      )
    })

    it('should deduplicate addresses when merging with existing wallets', async () => {
      const components = await initComponents()

      jest.spyOn(utils, 'fetchWorldDeploymentPermissions').mockResolvedValueOnce({
        type: 'allow-list',
        wallets: [VALID_ADDRESS_1.toLowerCase()]
      })

      const executeSignedRequest = jest.spyOn(utils, 'executeSignedRequest').mockResolvedValueOnce({})

      await worldPermissions.main({
        args: { _: [], '--world': WORLD_NAME, '--address': [VALID_ADDRESS_1] },
        components
      })

      const calledMetadata = (executeSignedRequest.mock.calls[0][2] as { metadata: Record<string, unknown> }).metadata as { wallets: string[] }
      const occurrences = calledMetadata.wallets.filter((w) => w === VALID_ADDRESS_1.toLowerCase()).length
      expect(occurrences).toBe(1)
    })

    it('should use a custom target-content URL when provided', async () => {
      const components = await initComponents()
      const customServer = 'https://custom-worlds-server.example.com'

      jest
        .spyOn(utils, 'fetchWorldDeploymentPermissions')
        .mockResolvedValueOnce({ type: 'allow-list', wallets: [] })

      const executeSignedRequest = jest.spyOn(utils, 'executeSignedRequest').mockResolvedValueOnce({})

      await worldPermissions.main({
        args: {
          _: [],
          '--world': WORLD_NAME,
          '--address': [VALID_ADDRESS_1],
          '--target-content': customServer
        },
        components
      })

      expect(executeSignedRequest).toBeCalledWith(
        components,
        expect.any(Object),
        expect.objectContaining({
          url: `${customServer}/world/${encodeURIComponent(WORLD_NAME)}/permissions/deployment`
        }),
        expect.any(Function)
      )
    })
  })

  describe('parcel-specific permissions (--parcels)', () => {
    it('should call executeSignedRequest once per address with parcel list', async () => {
      const components = await initComponents()
      const executeSignedRequest = jest.spyOn(utils, 'executeSignedRequest').mockResolvedValue({})

      await worldPermissions.main({
        args: {
          _: [],
          '--world': WORLD_NAME,
          '--address': [VALID_ADDRESS_1, VALID_ADDRESS_2],
          '--parcels': '0,0 1,0 -1,2'
        },
        components
      })

      expect(executeSignedRequest).toBeCalledTimes(2)

      expect(executeSignedRequest).toHaveBeenNthCalledWith(
        1,
        components,
        { linkerPort: undefined, isHttps: false, openBrowser: true },
        {
          url: `https://worlds-content-server.decentraland.org/world/${encodeURIComponent(WORLD_NAME)}/permissions/deployment/address/${VALID_ADDRESS_1.toLowerCase()}/parcels`,
          method: 'POST',
          metadata: { parcels: ['0,0', '1,0', '-1,2'] }
        },
        expect.any(Function)
      )

      expect(executeSignedRequest).toHaveBeenNthCalledWith(
        2,
        components,
        expect.any(Object),
        {
          url: `https://worlds-content-server.decentraland.org/world/${encodeURIComponent(WORLD_NAME)}/permissions/deployment/address/${VALID_ADDRESS_2.toLowerCase()}/parcels`,
          method: 'POST',
          metadata: { parcels: ['0,0', '1,0', '-1,2'] }
        },
        expect.any(Function)
      )
    })

    it('should NOT fetch existing permissions when parcels are provided', async () => {
      const components = await initComponents()
      const fetchPermissions = jest.spyOn(utils, 'fetchWorldDeploymentPermissions')
      jest.spyOn(utils, 'executeSignedRequest').mockResolvedValueOnce({})

      await worldPermissions.main({
        args: {
          _: [],
          '--world': WORLD_NAME,
          '--address': [VALID_ADDRESS_1],
          '--parcels': '0,0'
        },
        components
      })

      expect(fetchPermissions).not.toBeCalled()
    })

    it('should support negative parcel coordinates', async () => {
      const components = await initComponents()
      const executeSignedRequest = jest.spyOn(utils, 'executeSignedRequest').mockResolvedValueOnce({})

      await worldPermissions.main({
        args: {
          _: [],
          '--world': WORLD_NAME,
          '--address': [VALID_ADDRESS_1],
          '--parcels': '-10,-20 -5,3 0,-1'
        },
        components
      })

      expect(executeSignedRequest).toBeCalledWith(
        components,
        expect.any(Object),
        expect.objectContaining({
          metadata: { parcels: ['-10,-20', '-5,3', '0,-1'] }
        }),
        expect.any(Function)
      )
    })
  })

  describe('API callback — world-wide', () => {
    it('should POST to the permissions endpoint with auth headers on success', async () => {
      const components = await initComponents()
      const authHeaders = { 'x-identity-auth-chain-0': '{}', 'x-identity-timestamp': '12345', 'x-identity-metadata': '{}' }

      jest
        .spyOn(utils, 'fetchWorldDeploymentPermissions')
        .mockResolvedValueOnce({ type: 'allow-list', wallets: [] })

      // Capture and immediately invoke the callback
      jest.spyOn(utils, 'executeSignedRequest').mockImplementation(async (_c, _o, _req, cb) => {
        await cb(authHeaders)
        return {}
      })

      const fetchSpy = jest.spyOn(components.fetch, 'fetch').mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => ''
      } as any)

      await worldPermissions.main({
        args: { _: [], '--world': WORLD_NAME, '--address': [VALID_ADDRESS_1] },
        components
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/permissions/deployment'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            ...authHeaders
          })
        })
      )
    })

    it('should throw WORLD_PERMISSIONS_GRANT_FAILED when the API returns an error', async () => {
      const components = await initComponents()
      const authHeaders = { 'x-identity-auth-chain-0': '{}', 'x-identity-timestamp': '12345', 'x-identity-metadata': '{}' }

      jest
        .spyOn(utils, 'fetchWorldDeploymentPermissions')
        .mockResolvedValueOnce({ type: 'allow-list', wallets: [] })

      jest.spyOn(utils, 'executeSignedRequest').mockImplementation(async (_c, _o, _req, cb) => {
        await cb(authHeaders)
        return {}
      })

      jest.spyOn(components.fetch, 'fetch').mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden'
      } as any)

      await expect(() =>
        worldPermissions.main({
          args: { _: [], '--world': WORLD_NAME, '--address': [VALID_ADDRESS_1] },
          components
        })
      ).rejects.toThrow('Failed to grant permissions')
    })
  })

  describe('API callback — parcel-specific', () => {
    it('should POST to the parcel permissions endpoint with auth headers on success', async () => {
      const components = await initComponents()
      const authHeaders = { 'x-identity-auth-chain-0': '{}', 'x-identity-timestamp': '12345', 'x-identity-metadata': '{}' }

      jest.spyOn(utils, 'executeSignedRequest').mockImplementation(async (_c, _o, _req, cb) => {
        await cb(authHeaders)
        return {}
      })

      const fetchSpy = jest.spyOn(components.fetch, 'fetch').mockResolvedValue({
        ok: true,
        status: 204,
        text: async () => ''
      } as any)

      await worldPermissions.main({
        args: { _: [], '--world': WORLD_NAME, '--address': [VALID_ADDRESS_1], '--parcels': '0,0 1,0' },
        components
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/parcels'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'Content-Type': 'application/json' })
        })
      )
    })

    it('should throw WORLD_PERMISSIONS_GRANT_FAILED when the parcel API returns an error', async () => {
      const components = await initComponents()
      const authHeaders = { 'x-identity-auth-chain-0': '{}', 'x-identity-timestamp': '12345', 'x-identity-metadata': '{}' }

      jest.spyOn(utils, 'executeSignedRequest').mockImplementation(async (_c, _o, _req, cb) => {
        await cb(authHeaders)
        return {}
      })

      jest.spyOn(components.fetch, 'fetch').mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden'
      } as any)

      await expect(() =>
        worldPermissions.main({
          args: { _: [], '--world': WORLD_NAME, '--address': [VALID_ADDRESS_1], '--parcels': '0,0' },
          components
        })
      ).rejects.toThrow('Failed to grant permissions')
    })
  })

  describe('help', () => {
    it('should print help without throwing', async () => {
      const components = await initComponents()
      const logSpy = jest.spyOn(components.logger, 'log').mockImplementation()

      worldPermissions.help({ args: { _: [] }, components })

      expect(logSpy).toBeCalled()
    })
  })
})
