import future, { IFuture } from 'fp-future'
import { Authenticator } from '@dcl/crypto'
import { ethSign } from '@dcl/crypto/dist/crypto'
import { hexToBytes } from 'eth-connect'
import { Lifecycle } from '@well-known-components/interfaces'
import { Router } from '@well-known-components/http-server'
import readline from 'readline'

import { CliComponents } from '../../components'
import { CliError } from '../../logic/error'
import { createWallet } from '../../logic/account'
import { createAuthChainHeaders } from '../../logic/auth-chain-headers'
import { setRoutes, LinkerResponse } from '../../linker-dapp/routes'
import { runDapp } from '../../run-dapp'
import { getValidWorkspace } from '../../logic/workspace-validations'
import { getValidSceneJson } from '../../logic/scene-validations'
import { StorageInfo, LinkerOptions, StorageType } from './types'

const STORAGE_SERVER_ORG = 'https://storage.decentraland.org'

/**
 * Validates workspace and extracts world configuration for server-side storage operations
 */
export const validateWorkspaceAndWorld = async (
  components: CliComponents,
  projectRoot: string,
  baseURL: string
): Promise<{ worldName: string | undefined; baseParcel: string; parcels: string[] }> => {
  await getValidWorkspace(components, projectRoot)

  const isLocalTarget = baseURL.includes('localhost') || baseURL.includes('127.0.0.1')
  const sceneJson = await getValidSceneJson(components, projectRoot)

  const worldName = sceneJson.worldConfiguration?.name
  if (!worldName && !isLocalTarget) {
    throw new CliError(
      'STORAGE_MISSING_WORLD',
      'scene.json must have worldConfiguration.name defined to use storage on remote servers'
    )
  }

  const baseParcel = sceneJson.scene?.base || '0,0'
  const parcels = sceneJson.scene?.parcels || ['0,0']

  return { worldName, baseParcel, parcels }
}

/**
 * Builds metadata for server-side storage service requests (ADR-44 format)
 */
export const buildStorageMetadata = (worldName: string | undefined, baseParcel: string): string => {
  const meta: Record<string, unknown> = {}
  if (worldName) {
    meta.realm = { serverName: worldName }
    meta.realmName = worldName
  }
  meta.parcel = baseParcel
  return JSON.stringify(meta)
}

/**
 * Confirms an action with the user
 * Accepts: yes, y, no, n (case insensitive)
 */
export const confirmAction = async (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    rl.question(`${message} (Yes/No): `, (answer) => {
      rl.close()
      const normalized = answer.toLowerCase().trim()
      resolve(normalized === 'yes' || normalized === 'y')
    })
  })
}

/**
 * Extracts linker dApp options from command arguments
 */
export const getLinkerDappOptions = (args: {
  '--port'?: number
  '--no-browser'?: boolean
  '--https'?: boolean
}): LinkerOptions => {
  return {
    linkerPort: args['--port'],
    openBrowser: !args['--no-browser'],
    isHttps: !!args['--https']
  }
}

/**
 * Common setup for server-side storage commands: validates action, workspace, and world configuration
 */
export const setupStorageCommand = async (
  components: CliComponents,
  projectRoot: string,
  action: string,
  targetArg: string | undefined,
  validActions: string[]
): Promise<{
  baseURL: string
  worldName: string | undefined
  baseParcel: string
  parcels: string[]
}> => {
  const { logger } = components

  // Validate action
  if (!validActions.includes(action)) {
    throw new CliError('STORAGE_INVALID_ACTION', `Invalid action '${action}'. Use: ${validActions.join(', ')}`)
  }

  // Get base URL
  const baseURL = getStorageBaseUrl(targetArg)

  // Validate workspace and world
  const { worldName, baseParcel, parcels } = await validateWorkspaceAndWorld(components, projectRoot, baseURL)

  if (worldName) {
    logger.info(`World: ${worldName}`)
  } else {
    logger.info(`Local development mode (no world configuration required)`)
  }

  return { baseURL, worldName, baseParcel, parcels }
}

export type StorageOperationResult = {
  success: boolean
  data?: any
  error?: string
}

/**
 * Sets up routes for the linker dApp specific to server-side storage operations
 */
const setStorageRoutes = (
  router: Router<object>,
  components: CliComponents,
  awaitResponse: IFuture<void>,
  deployCallback: (response: LinkerResponse) => Promise<StorageOperationResult>
): Router<object> => {
  const { logger } = components

  const resolveLinkerPromise = () => setTimeout(() => awaitResponse.resolve(), 100)
  const rejectLinkerPromise = (e: Error) => setTimeout(() => awaitResponse.reject(e), 100)

  router.post('/api/storage', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse

    if (!value.address || !value.authChain) {
      const errorMessage = `Invalid payload: ${Object.keys(value).join(' - ')}`
      logger.error(errorMessage)
      resolveLinkerPromise()
      return { status: 400, body: { success: false, error: errorMessage } }
    }

    try {
      const result = await deployCallback(value)
      resolveLinkerPromise()

      if (!result.success) {
        return { status: 400, body: { success: false, error: result.error } }
      }

      return { body: { success: true, data: result.data } }
    } catch (e) {
      rejectLinkerPromise(e as Error)
      return { status: 400, body: { success: false, error: (e as Error).message } }
    }
  })

  return router
}

/**
 * Gets authentication (private key or linker dApp) and executes callback with signed headers
 */
export const getAuthHeaders = async (
  components: CliComponents,
  awaitResponse: IFuture<void>,
  info: StorageInfo,
  linkOptions: LinkerOptions,
  deployCallback: (response: LinkerResponse) => Promise<StorageOperationResult>
): Promise<{ program?: Lifecycle.ComponentBasedProgram<unknown> }> => {
  // If DCL_PRIVATE_KEY is set, sign directly without the linker dapp
  if (process.env.DCL_PRIVATE_KEY) {
    const wallet = createWallet(process.env.DCL_PRIVATE_KEY)
    const authChain = Authenticator.createSimpleAuthChain(
      info.rootCID,
      wallet.address,
      ethSign(hexToBytes(wallet.privateKey), info.rootCID)
    )
    const linkerResponse = { authChain, address: wallet.address }
    await deployCallback(linkerResponse)
    awaitResponse.resolve()
    return {}
  }

  // Use linker dapp for signing
  const { router: commonRouter } = setRoutes(components, {
    storageType: info.storageType,
    key: info.key,
    value: info.value,
    address: info.address,
    world: info.world,
    action: info.action,
    targetUrl: info.targetUrl,
    rootCID: info.rootCID,
    baseParcel: info.baseParcel,
    parcels: info.parcels,
    skipValidations: info.skipValidations,
    debug: info.debug,
    isWorld: info.isWorld,
    title: 'Storage Service',
    description: 'Manage storage in the Decentraland Storage Service'
  })
  const router = setStorageRoutes(commonRouter, components, awaitResponse, deployCallback)

  const actionLabel = info.action === 'delete' || info.action === 'clear' ? 'delete' : 'deploy'
  components.logger.info(`You need to sign the content before the ${actionLabel}:`)
  const { program } = await runDapp(components, router, { ...linkOptions, uri: `/` })

  return { program }
}

/**
 * Makes an authenticated request to the server-side storage service
 */
export const makeAuthenticatedRequest = async (
  components: CliComponents,
  info: StorageInfo,
  linkOptions: LinkerOptions,
  method: 'GET' | 'PUT' | 'DELETE',
  url: string,
  body?: any,
  additionalHeaders?: Record<string, string>
): Promise<StorageOperationResult> => {
  const { fetch: fetchComponent } = components
  const awaitResponse = future<void>()
  let operationResult: StorageOperationResult = { success: false, error: 'Operation not completed' }

  const { program } = await getAuthHeaders(components, awaitResponse, info, linkOptions, async (linkerResponse) => {
    const authHeaders = createAuthChainHeaders(linkerResponse.authChain, info.timestamp, info.metadata)

    const headers: Record<string, string> = {
      ...authHeaders,
      ...additionalHeaders
    }

    if (method !== 'GET') {
      headers['Content-Type'] = 'application/json'
    }

    const res = await fetchComponent.fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    })

    if (res.ok) {
      try {
        const text = await res.text()
        const responseData = text ? JSON.parse(text) : {}
        operationResult = { success: true, data: responseData.value }
      } catch {
        operationResult = { success: true }
      }
    } else {
      const errorText = await res.text()
      operationResult = { success: false, error: errorText }
    }

    return operationResult
  })

  try {
    await awaitResponse
  } finally {
    void program?.stop()
  }

  return operationResult
}

/**
 * Gets the base URL for server-side storage service operations
 */
export const getStorageBaseUrl = (targetArg?: string): string => {
  return targetArg || STORAGE_SERVER_ORG
}

/**
 * Creates storage info object for signing server-side storage service requests
 */
export const createStorageInfo = (
  storageType: StorageType,
  action: 'get' | 'set' | 'delete' | 'clear',
  url: string,
  worldName: string | undefined,
  baseParcel: string,
  parcels: string[],
  key?: string,
  value?: string,
  address?: string
): StorageInfo => {
  const timestamp = String(Date.now())
  const metadata = buildStorageMetadata(worldName, baseParcel)
  const pathname = new URL(url).pathname

  const method = action === 'get' ? 'get' : action === 'set' ? 'put' : 'delete'
  const payload = [method, pathname, timestamp, metadata].join(':').toLowerCase()

  return {
    storageType,
    key,
    value,
    address,
    world: worldName,
    action,
    targetUrl: url,
    rootCID: payload,
    timestamp,
    metadata,
    baseParcel,
    parcels,
    skipValidations: true,
    debug: !!process.env.DEBUG,
    isWorld: true
  }
}
