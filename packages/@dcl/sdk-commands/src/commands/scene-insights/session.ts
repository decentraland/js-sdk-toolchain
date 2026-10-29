import { randomBytes } from 'crypto'
import {
  AuthChain,
  AuthIdentity,
  AuthLinkType,
  Authenticator,
  ScopedAuthLinkType,
  getScopedEphemeralMessage
} from '@dcl/crypto'
import { ethSign } from '@dcl/crypto/dist/crypto'
import { hexToBytes } from 'eth-connect'

import { CliError } from '../../logic/error'
import { createWallet } from '../../logic/account'
import { createAuthChainHeaders } from '../../logic/auth-chain-headers'

/** How long one signature lasts; after that, `scene-insights login` signs a new session. */
export const SESSION_MINUTES = 12 * 60
export const INSIGHTS_SERVICE = 'insights'
export const INSIGHTS_OPERATIONS = ['logs-read', 'metrics-read', 'executions-read'] as const

export function getInsightsSessionMessage(address: string, expiration: Date): string {
  return getScopedEphemeralMessage(
    address,
    expiration,
    INSIGHTS_OPERATIONS.map((operation) => ({ service: INSIGHTS_SERVICE, operation }))
  )
}

/**
 * Signs any number of requests after a single wallet signature.
 *
 * Every insights request is a signed fetch over `method:path:timestamp:metadata`, so paging, tail
 * reconnects and repeated commands need many signatures. Instead of asking the wallet for each one,
 * the wallet signs once to delegate to an ephemeral key held by the CLI, and that key signs each
 * request (session-store.ts keeps it between commands).
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
  const message = getInsightsSessionMessage(ephemeralIdentity.address, expiration)
  const authChain: AuthChain = [
    { type: AuthLinkType.SIGNER, payload: wallet.address, signature: '' },
    {
      type: ScopedAuthLinkType.ECDSA_PERSONAL_SCOPED_EPHEMERAL as AuthLinkType,
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
 * link a signature of the message by the dApp's key, which is exactly a scoped delegation, so
 * it is relabeled as one: wallet → dApp key → our key.
 *
 * @throws CliError when the chain does not sign the message, or comes from a contract wallet
 *   (scoped contract-wallet chains require a provider rather than Catalyst validation).
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

  const delegation: AuthChain = [
    ...authChain.slice(0, -1),
    { ...last, type: ScopedAuthLinkType.ECDSA_PERSONAL_SCOPED_EPHEMERAL as AuthLinkType }
  ]
  const result = await Authenticator.validateSignature(ephemeralAddress.toLowerCase(), delegation, null, now, {
    service: INSIGHTS_SERVICE
  })
  if (!result.ok) {
    throw new CliError(
      'SCENE_INSIGHTS_INVALID_SIGNATURE',
      `The insights session signature is invalid: ${result.message}`
    )
  }
  return delegation
}
