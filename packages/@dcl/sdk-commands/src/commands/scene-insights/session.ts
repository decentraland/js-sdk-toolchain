import { randomBytes } from 'crypto'
import future from 'fp-future'
import { AuthChain, AuthIdentity, AuthLinkType, Authenticator } from '@dcl/crypto'
import { ethSign } from '@dcl/crypto/dist/crypto'
import { hexToBytes } from 'eth-connect'
import { Router } from '@well-known-components/http-server'

import { CliComponents } from '../../components'
import { CliError } from '../../logic/error'
import { createWallet } from '../../logic/account'
import { createAuthChainHeaders } from '../../logic/auth-chain-headers'
import { setRoutes, LinkerResponse } from '../../linker-dapp/routes'
import { dAppOptions, runDapp } from '../../run-dapp'
import { SceneTarget } from './inputs'

/** How long one signature lasts. A command that runs longer (a long tail) has to be started again. */
export const SESSION_MINUTES = 12 * 60

/**
 * Signs requests for the whole run of a command after a single wallet signature.
 *
 * Every insights request is a signed fetch over `method:path:timestamp:metadata`, so a command that
 * pages through results or reconnects a tail needs many signatures. Instead of asking the wallet for
 * each one, the wallet signs once to delegate to an ephemeral key that only lives in this process,
 * and that key signs each request.
 */
export interface InsightsSession {
  /** The wallet address the requests are made as */
  address: string
  /** When the delegation stops being accepted */
  expiration: Date
  /** Signed-fetch headers for one request */
  sign(method: string, pathname: string, metadata: string): Record<string, string>
}

/** The payload a signed fetch signs (crypto-middleware 6): method, path and timestamp lowercased, metadata verbatim. */
export function buildSignedFetchPayload(method: string, pathname: string, timestamp: string, metadata: string): string {
  return [method.toLowerCase(), pathname.toLowerCase(), timestamp, metadata].join(':')
}

/** A fresh ephemeral key from a secure random source. */
export function createEphemeralIdentity(): AuthIdentity['ephemeralIdentity'] {
  const privateKey = `0x${randomBytes(32).toString('hex')}`
  const { address } = createWallet(privateKey)
  return { privateKey, publicKey: '0x', address }
}

/** Builds a session from a delegation chain whose final authority is the ephemeral key. */
export function createSessionFromChain(
  ephemeralIdentity: AuthIdentity['ephemeralIdentity'],
  expiration: Date,
  authChain: AuthChain
): InsightsSession {
  const identity: AuthIdentity = { ephemeralIdentity, expiration, authChain }
  return {
    address: Authenticator.ownerAddress(authChain),
    expiration,
    sign(method, pathname, metadata) {
      const timestamp = String(Date.now())
      const requestChain = Authenticator.signPayload(
        identity,
        buildSignedFetchPayload(method, pathname, timestamp, metadata)
      )
      return createAuthChainHeaders(requestChain, timestamp, metadata)
    }
  }
}

/** A delegation signed directly with a private key (`DCL_PRIVATE_KEY`). */
export function createSessionFromPrivateKey(privateKey: string, now: number = Date.now()): InsightsSession {
  const wallet = createWallet(privateKey)
  const ephemeralIdentity = createEphemeralIdentity()
  const expiration = new Date(now + SESSION_MINUTES * 60 * 1000)
  const message = Authenticator.getEphemeralMessage(ephemeralIdentity.address, expiration)
  const authChain: AuthChain = [
    { type: AuthLinkType.SIGNER, payload: wallet.address, signature: '' },
    {
      type: AuthLinkType.ECDSA_PERSONAL_EPHEMERAL,
      payload: message,
      signature: ethSign(hexToBytes(wallet.privateKey), message)
    }
  ]
  return createSessionFromChain(ephemeralIdentity, expiration, authChain)
}

/**
 * Turns what the linker dApp returns into a delegation to our ephemeral key.
 *
 * The dApp signs whatever it is given with its own browser-side ephemeral key, closing the chain
 * with an `ECDSA_SIGNED_ENTITY` link. Handing it our ephemeral key's login message makes that last
 * link a signature of the message by the dApp's key, which is exactly an ephemeral delegation, so
 * it is relabeled as one: wallet → dApp key → our key.
 *
 * @throws CliError when the chain does not sign the message, or comes from a contract wallet
 *   (the service only accepts contract-wallet chains of up to three links).
 */
export async function delegationFromLinkerChain(
  authChain: AuthChain,
  ephemeralAddress: string,
  message: string,
  now: number = Date.now()
): Promise<AuthChain> {
  if (authChain.some((link) => link.type === AuthLinkType.ECDSA_EIP_1654_EPHEMERAL)) {
    throw new CliError(
      'SCENE_INSIGHTS_UNSUPPORTED_WALLET',
      'Smart contract wallets cannot sign insights sessions in the browser; set DCL_PRIVATE_KEY to an address with access instead'
    )
  }

  const last = authChain[authChain.length - 1]
  if (
    authChain.length < 2 ||
    !last ||
    last.type !== AuthLinkType.ECDSA_PERSONAL_SIGNED_ENTITY ||
    last.payload !== message
  ) {
    throw new CliError('SCENE_INSIGHTS_INVALID_SIGNATURE', 'The wallet did not sign the insights session')
  }

  const delegation: AuthChain = [...authChain.slice(0, -1), { ...last, type: AuthLinkType.ECDSA_PERSONAL_EPHEMERAL }]
  const result = await Authenticator.validateSignature(ephemeralAddress, delegation, null, now)
  if (!result.ok) {
    throw new CliError(
      'SCENE_INSIGHTS_INVALID_SIGNATURE',
      `The insights session signature is invalid: ${result.message}`
    )
  }
  return delegation
}

/**
 * Opens a session: with `DCL_PRIVATE_KEY` it signs locally, otherwise it opens the linker dApp for
 * the wallet to sign the delegation once.
 */
export async function openSession(
  components: CliComponents,
  target: SceneTarget,
  targetUrl: string,
  linkOptions: Omit<dAppOptions, 'uri'>
): Promise<InsightsSession> {
  if (process.env.DCL_PRIVATE_KEY) {
    return createSessionFromPrivateKey(process.env.DCL_PRIVATE_KEY)
  }

  const ephemeralIdentity = createEphemeralIdentity()
  const expiration = new Date(Date.now() + SESSION_MINUTES * 60 * 1000)
  const message = Authenticator.getEphemeralMessage(ephemeralIdentity.address, expiration)

  const signed = future<AuthChain>()
  const { router: commonRouter } = setRoutes(components, {
    rootCID: message,
    baseParcel: target.parcel ?? '0,0',
    parcels: [target.parcel ?? '0,0'],
    skipValidations: true,
    debug: !!process.env.DEBUG,
    isWorld: !!target.world,
    world: target.label,
    targetUrl,
    action: 'view-logs'
  })
  const router = setSessionRoutes(commonRouter, ephemeralIdentity.address, message, (chain) => signed.resolve(chain))

  components.logger.info(`Sign once to read the insights of ${target.label} for the next ${SESSION_MINUTES / 60} hours`)
  const { program } = await runDapp(components, router, { ...linkOptions, uri: '/' })

  try {
    return createSessionFromChain(ephemeralIdentity, expiration, await signed)
  } finally {
    void program.stop()
  }
}

/** The linker dApp posts `view-logs` signatures to `/api/logs`. */
function setSessionRoutes(
  router: Router<object>,
  ephemeralAddress: string,
  message: string,
  onSigned: (delegation: AuthChain) => void
): Router<object> {
  router.post('/api/logs', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse
    try {
      if (!value.address || !Array.isArray(value.authChain)) {
        throw new CliError('SCENE_INSIGHTS_INVALID_SIGNATURE', 'The wallet did not sign the insights session')
      }
      const delegation = await delegationFromLinkerChain(value.authChain, ephemeralAddress, message)
      // answer the dApp before the server is stopped
      setTimeout(() => onSigned(delegation), 100)
      return { body: { success: true } }
    } catch (e) {
      return { status: 400, body: { success: false, error: (e as Error).message } }
    }
  })
  return router
}
