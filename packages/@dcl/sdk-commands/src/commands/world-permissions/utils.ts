import future, { IFuture } from 'fp-future'
import { hexToBytes } from 'eth-connect'
import { ethSign } from '@dcl/crypto/dist/crypto'
import { Authenticator, AuthChain } from '@dcl/crypto'
import { Lifecycle } from '@well-known-components/interfaces'

import { CliComponents } from '../../components'
import { createWallet } from '../../logic/account'
import { LinkerResponse, setRoutes } from '../../linker-dapp/routes'
import { dAppOptions, runDapp } from '../../run-dapp'
import { CliError } from '../../logic/error'
import i18next from 'i18next'

export const DEFAULT_WORLDS_CONTENT_SERVER = 'https://worlds-content-server.decentraland.org'

const AUTH_CHAIN_HEADER_PREFIX = 'x-identity-auth-chain-'
const AUTH_TIMESTAMP_HEADER = 'x-identity-timestamp'
const AUTH_METADATA_HEADER = 'x-identity-metadata'

export interface WorldPermissionsDeployment {
  type: string
  wallets: string[]
}

export interface WorldPermissionsResponse {
  permissions: {
    deployment: WorldPermissionsDeployment
  }
}

export async function fetchWorldDeploymentPermissions(
  fetchFn: CliComponents['fetch'],
  targetContent: string,
  worldName: string
): Promise<WorldPermissionsDeployment> {
  const encodedName = encodeURIComponent(worldName)
  const url = `${targetContent}/world/${encodedName}/permissions`
  const response = await fetchFn.fetch(url)
  if (!response.ok) {
    if (response.status === 404) {
      return { type: 'allow-list', wallets: [] }
    }
    const text = await response.text()
    throw new CliError(
      'WORLD_PERMISSIONS_FETCH_FAILED',
      i18next.t('errors.world_permissions.fetch_failed', { error: `${response.status} ${text}` })
    )
  }
  const data = (await response.json()) as WorldPermissionsResponse
  return data.permissions?.deployment ?? { type: 'allow-list', wallets: [] }
}

function createAuthchainHeaders(authchain: AuthChain, timestamp: string, metadata: string): Record<string, string> {
  const headers: Record<string, string> = {}
  authchain.forEach((link, i) => {
    headers[`${AUTH_CHAIN_HEADER_PREFIX}${i}`] = JSON.stringify(link)
  })
  headers[AUTH_TIMESTAMP_HEADER] = timestamp
  headers[AUTH_METADATA_HEADER] = metadata
  return headers
}

export async function executeSignedRequest(
  components: CliComponents,
  linkerOpts: Omit<dAppOptions, 'uri'>,
  requestData: {
    url: string
    method: 'POST' | 'PUT' | 'DELETE'
    metadata: Record<string, unknown>
    worldName: string
  },
  callback: (authchainHeaders: Record<string, string>) => Promise<void>
): Promise<{ program?: Lifecycle.ComponentBasedProgram<unknown> }> {
  const timestamp = String(Date.now())
  const pathname = new URL(requestData.url).pathname
  const metadataStr = JSON.stringify(requestData.metadata)
  const payload = [requestData.method, pathname, timestamp, metadataStr].join(':').toLowerCase()

  if (process.env.DCL_PRIVATE_KEY) {
    const wallet = createWallet(process.env.DCL_PRIVATE_KEY)
    const authChain = Authenticator.createSimpleAuthChain(
      payload,
      wallet.address,
      ethSign(hexToBytes(wallet.privateKey), payload)
    )
    await callback(createAuthchainHeaders(authChain, timestamp, metadataStr))
    return {}
  }

  const awaitResponse: IFuture<void> = future()
  const info = {
    worldName: requestData.worldName,
    allowed: [],
    oldAllowed: [],
    method: 'put',
    payload,
    expiration: 600
  }
  const { router } = setRoutes(components, info, '/acl')
  const { logger } = components

  const resolveLinkerPromise = () => setTimeout(() => awaitResponse.resolve(), 100)
  const rejectLinkerPromise = (e: Error) => setTimeout(() => awaitResponse.reject(e), 100)

  router.get('/api/acl', async () => ({
    body: info
  }))

  router.post('/api/acl', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse

    if (!value.address || !value.authChain) {
      const errorMessage = `Invalid payload: ${Object.keys(value).join(' - ')}`
      logger.error(errorMessage)
      resolveLinkerPromise()
      return { status: 400, body: { message: errorMessage } }
    }

    try {
      await callback(createAuthchainHeaders(value.authChain, timestamp, metadataStr))
      resolveLinkerPromise()
      return {}
    } catch (e) {
      rejectLinkerPromise(e as Error)
      return { status: 400, body: { message: (e as Error).message } }
    }
  })

  logger.info('You need to sign the request to continue:')
  const { program } = await runDapp(components, router, { ...linkerOpts, uri: '/acl' })

  try {
    await awaitResponse
  } finally {
    void program?.stop()
  }

  return { program }
}
