import { resolve } from 'path'
import { Result } from 'arg'
import future, { IFuture } from 'fp-future'
import { Authenticator } from '@dcl/crypto'
import { ethSign } from '@dcl/crypto/dist/crypto'
import { hexToBytes } from 'eth-connect'
import { Lifecycle } from '@well-known-components/interfaces'
import { Router } from '@well-known-components/http-server'

import { declareArgs } from '../../logic/args'
import { CliComponents } from '../../components'
import { CliError } from '../../logic/error'
import { printError, printSuccess } from '../../logic/beautiful-logs'
import { createWallet } from '../../logic/account'
import { createAuthChainHeaders } from '../../logic/auth-chain-headers'
import { setRoutes, LinkerResponse } from '../../linker-dapp/routes'
import { dAppOptions, runDapp } from '../../run-dapp'
import { getValidWorkspace } from '../../logic/workspace-validations'
import { getValidSceneJson } from '../../logic/scene-validations'

interface Options {
  args: Result<typeof args>
  components: CliComponents
}

export const args = declareArgs({
  '--help': Boolean,
  '-h': '--help',
  '--dir': String,
  '--target': String,
  '-t': '--target',
  '--port': Number,
  '-p': '--port',
  '--https': Boolean,
  '--no-browser': Boolean,
  '-b': '--no-browser',
  '--value': String,
  '-v': '--value',
  '--delete': Boolean,
  '-d': '--delete'
})

const STORAGE_SERVER_ORG = 'https://storage-server.decentraland.org'

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands deploy-env KEY [options]'
    Manages environment variables in the Server Side Storage service.
    Requires a scene.json with worldConfiguration.name in the project directory.

    Options:
      -h, --help                Displays complete help
      -v, --value       [value] The value to set for the environment variable
      -d, --delete              Delete the environment variable
      -t, --target      [URL]   Target storage server URL (default: ${STORAGE_SERVER_ORG})
      --dir             [path]  Path to the project directory
      -p, --port        [port]  Select a custom port for the linker dApp
      -b, --no-browser          Do not open a new browser window
      --https                   Use HTTPS for the linker dApp

    Target options:
      - https://storage-server.decentraland.org  (production - default)
      - https://storage-server.decentraland.zone (staging)
      - http://localhost:<port>                  (local development)

    Examples:
    - Set an environment variable:
      $ sdk-commands deploy-env MY_KEY --value my_value
      $ sdk-commands deploy-env MY_KEY -v my_value

    - Delete an environment variable:
      $ sdk-commands deploy-env MY_KEY --delete
      $ sdk-commands deploy-env MY_KEY -d

    - Deploy to zone:
      $ sdk-commands deploy-env MY_KEY --value my_value --target https://storage-server.decentraland.zone

    - Deploy to local development server:
      $ sdk-commands deploy-env MY_KEY --value my_value --target http://localhost:8000
`)
}

interface EnvVarInfo {
  key: string
  value?: string
  world?: string
  action: 'set' | 'delete'
  targetUrl: string
  rootCID: string // The message to sign (for linker-dapp compatibility)
  timestamp: string
  metadata: string
  // LinkerPage compatibility fields
  baseParcel: string
  parcels: string[]
  skipValidations: boolean
  debug: boolean
  isWorld: boolean
}

function setDeployEnvRoutes(
  router: Router<object>,
  components: CliComponents,
  awaitResponse: IFuture<void>,
  deployCallback: (response: LinkerResponse) => Promise<void>
): Router<object> {
  const { logger } = components

  const resolveLinkerPromise = () => setTimeout(() => awaitResponse.resolve(), 100)
  const rejectLinkerPromise = (e: Error) => setTimeout(() => awaitResponse.reject(e), 100)

  router.post('/api/deploy', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse

    if (!value.address || !value.authChain) {
      const errorMessage = `Invalid payload: ${Object.keys(value).join(' - ')}`
      logger.error(errorMessage)
      resolveLinkerPromise()
      return { status: 400, body: { message: errorMessage } }
    }

    try {
      await deployCallback(value)
      resolveLinkerPromise()
      return {}
    } catch (e) {
      rejectLinkerPromise(e as Error)
      return { status: 400, body: { message: (e as Error).message } }
    }
  })

  return router
}

async function getAddressAndSignature(
  components: CliComponents,
  awaitResponse: IFuture<void>,
  info: EnvVarInfo,
  linkOptions: Omit<dAppOptions, 'uri'>,
  deployCallback: (response: LinkerResponse) => Promise<void>
): Promise<{ program?: Lifecycle.ComponentBasedProgram<unknown> }> {
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

  // Use linker dapp for signing - pass info that LinkerPage expects
  const { router: commonRouter } = setRoutes(components, {
    // EnvVar specific fields
    key: info.key,
    value: info.value,
    world: info.world,
    action: info.action,
    // LinkerPage compatibility fields (used for signing)
    rootCID: info.rootCID,
    baseParcel: info.baseParcel,
    parcels: info.parcels,
    skipValidations: info.skipValidations,
    debug: info.debug,
    isWorld: info.isWorld,
    // Display info
    title: `Deploy Env: ${info.key}`,
    description: info.action === 'delete' ? `Delete environment variable` : `Set environment variable`
  })
  const router = setDeployEnvRoutes(commonRouter, components, awaitResponse, deployCallback)

  const actionLabel = info.action === 'delete' ? 'delete' : 'deploy'
  components.logger.info(`You need to sign the content before the ${actionLabel}:`)
  const { program } = await runDapp(components, router, { ...linkOptions, uri: `/` })

  return { program }
}

export async function main(options: Options) {
  const { logger, fetch: fetchComponent } = options.components
  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')

  // Validate workspace exists
  await getValidWorkspace(options.components, projectRoot)

  // Determine target URL (default to production)
  const baseURL = options.args['--target'] || STORAGE_SERVER_ORG
  const isLocalTarget = baseURL.includes('localhost') || baseURL.includes('127.0.0.1')

  // Get scene.json to extract worldConfiguration.name
  const sceneJson = await getValidSceneJson(options.components, projectRoot)

  // worldConfiguration.name is required for remote servers, optional for local development
  const worldName = sceneJson.worldConfiguration?.name
  if (!worldName && !isLocalTarget) {
    throw new CliError(
      'DEPLOY_ENV_MISSING_WORLD',
      'scene.json must have worldConfiguration.name defined to deploy environment variables to remote servers'
    )
  }

  if (worldName) {
    logger.info(`World: ${worldName}`)
  } else {
    logger.info(`Local development mode (no world configuration required)`)
  }

  // Parse KEY from positional arguments
  const positionalArgs = options.args._.filter((arg) => !arg.startsWith('-'))
  if (positionalArgs.length === 0) {
    throw new CliError(
      'DEPLOY_ENV_MISSING_KEY',
      'Missing KEY argument. Usage: sdk-commands deploy-env KEY --value VALUE'
    )
  }

  const key = positionalArgs[0].trim()
  if (!key) {
    throw new CliError('DEPLOY_ENV_EMPTY_KEY', 'Key cannot be empty')
  }

  const isDelete = !!options.args['--delete']
  const value = options.args['--value']

  // Validate mutually exclusive options
  if (isDelete && value !== undefined) {
    throw new CliError('DEPLOY_ENV_INVALID_OPTIONS', 'Cannot use --delete and --value together')
  }

  // Require either --delete or --value
  if (!isDelete && value === undefined) {
    throw new CliError(
      'DEPLOY_ENV_MISSING_ACTION',
      'Must specify either --value VALUE to set or --delete to remove the environment variable'
    )
  }

  // Linker dApp options
  const linkerPort = options.args['--port']
  const openBrowser = !options.args['--no-browser']
  const isHttps = !!options.args['--https']
  const linkOptions = { linkerPort, openBrowser, isHttps }

  const url = `${baseURL}/env/${encodeURIComponent(key)}`
  const timestamp = String(Date.now())
  const awaitResponse = future<void>()

  // Base parcel info from scene.json
  const baseParcel = sceneJson.scene?.base || '0,0'
  const parcels = sceneJson.scene?.parcels || ['0,0']

  if (isDelete) {
    // DELETE operation
    logger.info(`Deleting environment variable '${key}' from ${baseURL}`)

    // Include world in metadata for the server to identify the target (optional for local)
    const metadata = JSON.stringify(worldName ? { key, world: worldName } : { key })
    const pathname = new URL(url).pathname
    const payload = ['delete', pathname, timestamp, metadata].join(':').toLowerCase()

    const info: EnvVarInfo = {
      key,
      world: worldName,
      action: 'delete',
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

    const { program } = await getAddressAndSignature(
      options.components,
      awaitResponse,
      info,
      linkOptions,
      async (linkerResponse) => {
        const authHeaders = createAuthChainHeaders(linkerResponse.authChain, timestamp, metadata)

        const res = await fetchComponent.fetch(url, {
          method: 'DELETE',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json'
          }
        })

        if (res.ok) {
          options.components.analytics.track('Deploy Env Delete Success', { key })
          printSuccess(logger, `Environment variable '${key}' deleted successfully!`, '')
        } else {
          const errorBody = await res.text()
          options.components.analytics.track('Deploy Env Delete Failure', { key, status: res.status })
          printError(
            logger,
            `Failed to delete environment variable '${key}':`,
            new Error(`${res.status} - ${errorBody}`)
          )
        }
      }
    )

    try {
      await awaitResponse
    } finally {
      void program?.stop()
    }
  } else {
    // PUT operation (set value)
    logger.info(`Deploying environment variable '${key}' to ${baseURL}`)

    // Include world in metadata for the server to identify the target (optional for local)
    const metadata = JSON.stringify(worldName ? { key, value, world: worldName } : { key, value })
    const pathname = new URL(url).pathname
    const payload = ['put', pathname, timestamp, metadata].join(':').toLowerCase()

    const info: EnvVarInfo = {
      key,
      value,
      world: worldName,
      action: 'set',
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

    const { program } = await getAddressAndSignature(
      options.components,
      awaitResponse,
      info,
      linkOptions,
      async (linkerResponse) => {
        const authHeaders = createAuthChainHeaders(linkerResponse.authChain, timestamp, metadata)

        const res = await fetchComponent.fetch(url, {
          method: 'PUT',
          headers: {
            ...authHeaders,
            'Content-Type': 'text/plain'
          },
          body: value
        })

        if (res.ok) {
          options.components.analytics.track('Deploy Env Success', { key })
          printSuccess(logger, `Environment variable '${key}' deployed successfully!`, '')
        } else {
          const errorBody = await res.text()
          options.components.analytics.track('Deploy Env Failure', { key, status: res.status })
          printError(
            logger,
            `Failed to deploy environment variable '${key}':`,
            new Error(`${res.status} - ${errorBody}`)
          )
        }
      }
    )

    try {
      await awaitResponse
    } finally {
      void program?.stop()
    }
  }
}
