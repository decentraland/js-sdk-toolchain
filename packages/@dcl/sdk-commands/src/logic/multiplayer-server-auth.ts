import future from 'fp-future'
import { Authenticator } from '@dcl/crypto'
import { ethSign } from '@dcl/crypto/dist/crypto'
import { hexToBytes } from 'eth-connect'
import { Router } from '@well-known-components/http-server'

import { CliComponents } from '../components'
import { createWallet } from './account'
import { createAuthChainHeaders } from './auth-chain-headers'
import { setRoutes, LinkerResponse } from '../linker-dapp/routes'
import { dAppOptions, runDapp } from '../run-dapp'

export interface MultiplayerServerSignRequest {
  /** Exact string the auth chain signs. */
  payload: string
  timestamp: string
  metadata: string
  /** Shown as the world badge on the linker dApp. */
  displayLabel: string
  targetUrl: string
  linkOptions: Omit<dAppOptions, 'uri'>
  /** Printed before the browser opens. */
  prompt: string
}

/**
 * Signs a multiplayer-server request with `DCL_PRIVATE_KEY` when set, otherwise through the
 * linker dApp's server-logs page (the dApp only exposes that page for these requests).
 *
 * @returns The ADR-44 signed-fetch headers.
 */
export async function signMultiplayerServerRequest(
  components: CliComponents,
  request: MultiplayerServerSignRequest
): Promise<Record<string, string>> {
  const { payload, timestamp, metadata } = request

  if (process.env.DCL_PRIVATE_KEY) {
    const wallet = createWallet(process.env.DCL_PRIVATE_KEY)
    const authChain = Authenticator.createSimpleAuthChain(
      payload,
      wallet.address,
      ethSign(hexToBytes(wallet.privateKey), payload)
    )
    return createAuthChainHeaders(authChain, timestamp, metadata)
  }

  const signed = future<Record<string, string>>()
  const { router } = setRoutes(components, {
    rootCID: payload,
    baseParcel: '0,0',
    parcels: ['0,0'],
    skipValidations: true,
    debug: !!process.env.DEBUG,
    isWorld: true,
    world: request.displayLabel,
    targetUrl: request.targetUrl,
    action: 'view-logs'
  })
  addSignatureRoute(router, components, (response) => {
    signed.resolve(createAuthChainHeaders(response.authChain, timestamp, metadata))
  })

  components.logger.info(request.prompt)
  const { program } = await runDapp(components, router, { ...request.linkOptions, uri: `/` })

  try {
    return await signed
  } finally {
    await program.stop()
  }
}

/** The linker dApp's server-logs page posts the signature to `/api/logs`. */
function addSignatureRoute(
  router: Router<object>,
  components: CliComponents,
  onSigned: (response: LinkerResponse) => void
): void {
  router.post('/api/logs', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse

    if (!value.address || !value.authChain) {
      const errorMessage = `Invalid payload: ${Object.keys(value).join(' - ')}`
      components.logger.error(errorMessage)
      return { status: 400, body: { success: false, error: errorMessage } }
    }

    // Answer the dApp before the server is stopped
    setTimeout(() => onSigned(value), 100)
    return { body: { success: true } }
  })
}
