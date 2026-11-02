import {
  AuthChain,
  AuthIdentity,
  AuthLinkType,
  Authenticator
} from '../../../../packages/@dcl/sdk-commands/node_modules/@dcl/crypto'
import { ethSign } from '../../../../packages/@dcl/sdk-commands/node_modules/@dcl/crypto/dist/crypto'
import { hexToBytes } from '../../../../packages/@dcl/sdk-commands/node_modules/eth-connect'
import { createWallet } from '../../../../packages/@dcl/sdk-commands/src/logic/account'
import {
  buildSignedFetchPayload,
  createEphemeralIdentity,
  getInsightsSessionMessage,
  createSessionFromChain,
  createSessionFromPrivateKey,
  delegationFromLinkerChain,
  InsightsSession
} from '../../../../packages/@dcl/sdk-commands/src/commands/scene-insights/session'

const METADATA = JSON.stringify({ sceneId: 'example.dcl.eth', realmName: 'example.dcl.eth' })

/** Reads the chain back out of signed-fetch headers, as the service does. */
function chainFromHeaders(headers: Record<string, string>): AuthChain {
  const chain: AuthChain = []
  for (let index = 0; headers[`x-identity-auth-chain-${index}`]; index++) {
    chain.push(JSON.parse(headers[`x-identity-auth-chain-${index}`]))
  }
  return chain
}

/** Verifies a signed request the way the insights service's signed-fetch middleware does. */
async function verifyRequest(headers: Record<string, string>, method: string, pathname: string) {
  const payload = buildSignedFetchPayload(
    method,
    pathname,
    headers['x-identity-timestamp'],
    headers['x-identity-metadata']
  )
  const chain = chainFromHeaders(headers)
  const result = await Authenticator.authorizeSignature(payload, chain, null, {
    service: 'insights',
    operation: pathname.includes('metrics')
      ? 'metrics-read'
      : pathname.includes('executions')
        ? 'executions-read'
        : 'logs-read'
  })
  return { ok: result.ok, owner: Authenticator.ownerAddress(chain).toLowerCase(), length: chain.length }
}

/** What the linker dApp does: its own browser-side ephemeral key signs whatever payload it is handed. */
async function signLikeTheLinkerDapp(walletKey: string, payload: string): Promise<AuthChain> {
  const dappKey = createEphemeralIdentity()
  const dappIdentity: AuthIdentity = await Authenticator.initializeAuthChain(
    createWallet(walletKey).address,
    dappKey,
    1000,
    async (message) => ethSign(hexToBytes(walletKey), message)
  )
  return Authenticator.signPayload(dappIdentity, payload)
}

describe('when building the signed-fetch payload', () => {
  it('should lowercase the method, path and timestamp but keep the metadata verbatim', () => {
    expect(buildSignedFetchPayload('GET', '/v1/Logs', '1791813600000', '{"sceneId":"A"}')).toBe(
      'get:/v1/logs:1791813600000:{"sceneId":"A"}'
    )
  })
})

describe('when a session is created from a private key', () => {
  let walletKey: string
  let walletAddress: string
  let session: InsightsSession

  beforeEach(() => {
    const wallet = createEphemeralIdentity()
    walletKey = wallet.privateKey
    walletAddress = wallet.address.toLowerCase()
    session = createSessionFromPrivateKey(walletKey)
  })

  it('should make requests as the wallet address', () => {
    expect(session.address.toLowerCase()).toBe(walletAddress)
  })

  describe('and it signs a request', () => {
    let headers: Record<string, string>

    beforeEach(() => {
      headers = session.sign('GET', '/v1/logs', METADATA)
    })

    it('should produce a three-link chain that verifies as the wallet', async () => {
      expect(await verifyRequest(headers, 'GET', '/v1/logs')).toEqual({ ok: true, owner: walletAddress, length: 3 })
    })

    it('should reject a full-login verifier', async () => {
      const chain = chainFromHeaders(headers)
      expect(
        (
          await Authenticator.validateSignature(
            buildSignedFetchPayload('GET', '/v1/logs', headers['x-identity-timestamp'], METADATA),
            chain,
            null
          )
        ).ok
      ).toBe(false)
    })

    it('should refuse an operation outside the explicit read grants', async () => {
      const chain = chainFromHeaders(headers)
      expect(
        (
          await Authenticator.authorizeSignature(
            buildSignedFetchPayload('GET', '/v1/logs', headers['x-identity-timestamp'], METADATA),
            chain,
            null,
            { service: 'insights', operation: 'logs-delete' }
          )
        ).ok
      ).toBe(false)
    })

    it('should send the metadata exactly as signed', () => {
      expect(headers['x-identity-metadata']).toBe(METADATA)
    })
  })

  describe('and it signs two requests', () => {
    let first: Record<string, string>
    let second: Record<string, string>

    beforeEach(() => {
      first = session.sign('GET', '/v1/logs', METADATA)
      second = session.sign('GET', '/v1/metrics', METADATA)
    })

    it('should verify both without another wallet signature', async () => {
      expect([
        await verifyRequest(first, 'GET', '/v1/logs'),
        await verifyRequest(second, 'GET', '/v1/metrics')
      ]).toEqual([
        { ok: true, owner: walletAddress, length: 3 },
        { ok: true, owner: walletAddress, length: 3 }
      ])
    })
  })

  describe('and the request is replayed on another path', () => {
    let headers: Record<string, string>

    beforeEach(() => {
      headers = session.sign('GET', '/v1/logs', METADATA)
    })

    it('should not verify', async () => {
      expect((await verifyRequest(headers, 'GET', '/v1/executions')).ok).toBe(false)
    })
  })
})

describe('when the linker dApp returns a signature of the session message', () => {
  let walletKey: string
  let walletAddress: string
  let ephemeral: AuthIdentity['ephemeralIdentity']
  let expiration: Date
  let message: string
  let dappChain: AuthChain

  beforeEach(async () => {
    const wallet = createEphemeralIdentity()
    walletKey = wallet.privateKey
    walletAddress = wallet.address.toLowerCase()
    ephemeral = createEphemeralIdentity()
    expiration = new Date(Date.now() + 60 * 60 * 1000)
    message = getInsightsSessionMessage(ephemeral.address, expiration)
    dappChain = await signLikeTheLinkerDapp(walletKey, message)
  })

  describe('and the chain is turned into a delegation', () => {
    let delegation: AuthChain

    beforeEach(async () => {
      delegation = await delegationFromLinkerChain(dappChain, ephemeral.address, message)
    })

    it('should relabel the last link as an ephemeral delegation to our key', () => {
      expect(delegation.map((link) => link.type)).toEqual([
        AuthLinkType.SIGNER,
        AuthLinkType.ECDSA_PERSONAL_EPHEMERAL,
        'ECDSA_SCOPED_EPHEMERAL'
      ])
    })

    describe('and a session signs a request with it', () => {
      let headers: Record<string, string>

      beforeEach(() => {
        headers = createSessionFromChain(ephemeral, expiration, delegation).sign('GET', '/v1/logs/tail', METADATA)
      })

      it('should produce a four-link chain that verifies as the wallet', async () => {
        expect(await verifyRequest(headers, 'GET', '/v1/logs/tail')).toEqual({
          ok: true,
          owner: walletAddress,
          length: 4
        })
      })
    })
  })

  describe('and the chain signs a different payload', () => {
    let otherChain: AuthChain

    beforeEach(async () => {
      otherChain = await signLikeTheLinkerDapp(walletKey, 'get:/v1/logs:1:{}')
    })

    it('should throw an invalid signature error', async () => {
      await expect(delegationFromLinkerChain(otherChain, ephemeral.address, message)).rejects.toMatchObject({
        name: 'SCENE_INSIGHTS_INVALID_SIGNATURE'
      })
    })
  })

  describe('and the last signature was tampered with', () => {
    let tampered: AuthChain

    beforeEach(() => {
      const last = dappChain[dappChain.length - 1]
      tampered = [...dappChain.slice(0, -1), { ...last, signature: ethSign(hexToBytes(walletKey), 'something else') }]
    })

    it('should throw an invalid signature error', async () => {
      await expect(delegationFromLinkerChain(tampered, ephemeral.address, message)).rejects.toMatchObject({
        name: 'SCENE_INSIGHTS_INVALID_SIGNATURE'
      })
    })
  })

  describe('and the wallet is a smart contract wallet', () => {
    let contractChain: AuthChain

    beforeEach(() => {
      contractChain = dappChain.map((link) =>
        link.type === AuthLinkType.ECDSA_PERSONAL_EPHEMERAL
          ? { ...link, type: AuthLinkType.ECDSA_EIP_1654_EPHEMERAL }
          : link
      )
    })

    it('should throw an unsupported wallet error that points to DCL_PRIVATE_KEY', async () => {
      await expect(delegationFromLinkerChain(contractChain, ephemeral.address, message)).rejects.toMatchObject({
        name: 'SCENE_INSIGHTS_UNSUPPORTED_WALLET',
        message: expect.stringContaining('DCL_PRIVATE_KEY')
      })
    })
  })
})
