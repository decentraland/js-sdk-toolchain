import { Authenticator, AuthIdentity } from '../../../../packages/@dcl/sdk-commands/node_modules/@dcl/crypto'
import type { AuthChainProvider } from '../../../../packages/@dcl/sdk-commands/node_modules/@dcl/crypto-middleware'
import { createEphemeralIdentity } from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/session'
import {
  createInsightsProvider,
  validateInsightsSignature
} from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/signature-validation'

describe('when selecting the Insights signature RPC', () => {
  let previousUrl: string | undefined
  let fetchSpy: jest.SpyInstance
  let identity: AuthIdentity

  beforeEach(async () => {
    previousUrl = process.env.DCL_SCENE_INSIGHTS_RPC_URL
    delete process.env.DCL_SCENE_INSIGHTS_RPC_URL
    identity = await Authenticator.initializeScopedAuthChain(
      '0x1111111111111111111111111111111111111111',
      createEphemeralIdentity(),
      60,
      [{ service: 'insights', operation: 'logs-read' }],
      async () => '0x1234'
    )
    fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(async (_url, init) => {
      const payload = JSON.parse(String(init?.body))
      return new Response(JSON.stringify({ jsonrpc: '2.0', id: payload.id, result: '0x1626ba7e' + '0'.repeat(56) }))
    })
  })
  afterEach(() => {
    if (previousUrl === undefined) delete process.env.DCL_SCENE_INSIGHTS_RPC_URL
    else process.env.DCL_SCENE_INSIGHTS_RPC_URL = previousUrl
    jest.restoreAllMocks()
  })

  describe.each([
    ['https://multiplayer-scenes-insights-service.decentraland.org', 'mainnet'],
    ['https://multiplayer-scenes-insights-service.decentraland.zone', 'sepolia']
  ])('and the target is %s', (target, network) => {
    it('should verify using the matching network', async () => {
      await expect(
        validateInsightsSignature(
          identity.ephemeralIdentity.address.toLowerCase(),
          identity.authChain,
          Date.now(),
          createInsightsProvider(target)
        )
      ).resolves.toMatchObject({ ok: true })
      expect(fetchSpy).toHaveBeenCalledWith(
        new URL(`https://rpc.decentraland.org/${network}?project=sdk-commands`),
        expect.any(Object)
      )
    })
  })

  describe('and the target is custom without configured RPC', () => {
    it('should require explicit network configuration', async () => {
      await expect(
        validateInsightsSignature(
          identity.ephemeralIdentity.address.toLowerCase(),
          identity.authChain,
          Date.now(),
          createInsightsProvider('https://custom.example')
        )
      ).rejects.toMatchObject({ name: 'SCENE_INSIGHTS_INVALID_ARGUMENT' })
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('and a custom RPC is configured', () => {
    beforeEach(() => {
      process.env.DCL_SCENE_INSIGHTS_RPC_URL = 'https://rpc.example/sepolia'
    })
    it('should honor the explicit configuration', async () => {
      await validateInsightsSignature(
        identity.ephemeralIdentity.address.toLowerCase(),
        identity.authChain,
        Date.now(),
        createInsightsProvider('https://custom.example')
      )
      expect(fetchSpy).toHaveBeenCalledWith(new URL('https://rpc.example/sepolia'), expect.any(Object))
    })
  })

  describe('and a normal wallet signs without a contract', () => {
    beforeEach(async () => {
      const wallet = createEphemeralIdentity()
      identity = await Authenticator.initializeScopedAuthChain(
        wallet.address,
        createEphemeralIdentity(),
        60,
        [{ service: 'insights', operation: 'logs-read' }],
        async (message) => Authenticator.createSignature(wallet, message)
      )
    })
    it('should verify offline even for a custom target', async () => {
      await expect(
        validateInsightsSignature(
          identity.ephemeralIdentity.address.toLowerCase(),
          identity.authChain,
          Date.now(),
          createInsightsProvider('https://custom.example')
        )
      ).resolves.toMatchObject({ ok: true })
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('and the RPC never completes', () => {
    let provider: AuthChainProvider
    let signal: AbortSignal | undefined
    let result: Promise<unknown>
    beforeEach(() => {
      jest.useFakeTimers()
      provider = {
        sendAsync: (_payload, _callback, receivedSignal) => {
          signal = receivedSignal
        }
      }
      result = validateInsightsSignature(
        identity.ephemeralIdentity.address.toLowerCase(),
        identity.authChain,
        Date.now(),
        provider
      ).catch((error) => error)
    })
    afterEach(() => {
      jest.useRealTimers()
    })
    it('should stop at the whole-validation deadline and cancel pending RPC work', async () => {
      await jest.advanceTimersByTimeAsync(15_000)
      expect(await result).toMatchObject({ name: 'SCENE_INSIGHTS_UNAVAILABLE' })
      expect(signal?.aborted).toBe(true)
    })
  })
})
