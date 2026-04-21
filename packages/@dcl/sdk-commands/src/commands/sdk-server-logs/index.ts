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
import { printError } from '../../logic/beautiful-logs'
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
  '--world': String,
  '-w': '--world',
  '--position': String,
  '--target': String,
  '-t': '--target',
  '--port': Number,
  '-p': '--port',
  '--https': Boolean,
  '--no-browser': Boolean,
  '-b': '--no-browser'
})

const DEFAULT_SERVER = 'https://multiplayer-server.decentraland.org'

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands sdk-server-logs [options]'
    Streams real-time logs from the multiplayer server.
    Requires --world (or scene.json with worldConfiguration.name) for a world scene,
    or --position for a Genesis City scene.

    Options:
      -h, --help                Displays complete help
      -w, --world       [name]  World name (required for worlds, or uses scene.json)
      --position        [x,y]   Parcel coordinates. Required for Genesis City scenes,
                                and for multi-scene worlds to select a specific scene.
      -t, --target      [URL]   Target multiplayer server URL (default: ${DEFAULT_SERVER})
      --dir             [path]  Path to the project directory
      -p, --port        [port]  Select a custom port for the linker dApp
      -b, --no-browser          Do not open a new browser window
      --https                   Use HTTPS for the linker dApp

    Examples:
    - View logs for world in scene.json:
      $ sdk-commands sdk-server-logs

    - View logs for a specific world (single-scene):
      $ sdk-commands sdk-server-logs --world myworld
      $ sdk-commands sdk-server-logs -w myworld.dcl.eth

    - View logs for a specific scene in a multi-scene world:
      $ sdk-commands sdk-server-logs --world myworld.dcl.eth --position 10,10

    - View logs for a Genesis City scene:
      $ sdk-commands sdk-server-logs --position 27,7

    - Connect to local development server:
      $ sdk-commands sdk-server-logs --world myworld --target http://localhost:8000

    - Use private key for authentication (no browser):
      $ DCL_PRIVATE_KEY=0x... sdk-commands sdk-server-logs --world myworld
`)
}

function setServerLogsRoutes(
  router: Router<object>,
  components: CliComponents,
  awaitResponse: IFuture<void>,
  signCallback: (response: LinkerResponse) => Promise<void>
): Router<object> {
  const { logger } = components

  const resolveLinkerPromise = () => setTimeout(() => awaitResponse.resolve(), 100)
  const rejectLinkerPromise = (e: Error) => setTimeout(() => awaitResponse.reject(e), 100)

  router.post('/api/logs', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse

    if (!value.address || !value.authChain) {
      const errorMessage = `Invalid payload: ${Object.keys(value).join(' - ')}`
      logger.error(errorMessage)
      resolveLinkerPromise()
      return { status: 400, body: { success: false, error: errorMessage } }
    }

    try {
      await signCallback(value)
      resolveLinkerPromise()
      return { body: { success: true } }
    } catch (e) {
      rejectLinkerPromise(e as Error)
      return { status: 400, body: { success: false, error: (e as Error).message } }
    }
  })

  return router
}

async function getAddressAndSignature(
  components: CliComponents,
  awaitResponse: IFuture<void>,
  payload: string,
  world: string | undefined,
  targetUrl: string,
  linkOptions: Omit<dAppOptions, 'uri'>,
  signCallback: (response: LinkerResponse) => Promise<void>
): Promise<{ program?: Lifecycle.ComponentBasedProgram<unknown> }> {
  // If DCL_PRIVATE_KEY is set, sign directly without the linker dapp
  if (process.env.DCL_PRIVATE_KEY) {
    const wallet = createWallet(process.env.DCL_PRIVATE_KEY)
    const authChain = Authenticator.createSimpleAuthChain(
      payload,
      wallet.address,
      ethSign(hexToBytes(wallet.privateKey), payload)
    )
    const linkerResponse = { authChain, address: wallet.address }
    await signCallback(linkerResponse)
    awaitResponse.resolve()
    return {}
  }

  // Use linker dapp for signing - pass the payload as the rootCID
  const { router: commonRouter } = setRoutes(components, {
    rootCID: payload,
    baseParcel: '0,0',
    parcels: ['0,0'],
    skipValidations: true,
    debug: !!process.env.DEBUG,
    isWorld: !!world,
    world,
    targetUrl,
    action: 'view-logs'
  })
  const router = setServerLogsRoutes(commonRouter, components, awaitResponse, signCallback)

  components.logger.info('You need to sign to access server logs')
  const { program } = await runDapp(components, router, { ...linkOptions, uri: `/` })

  return { program }
}

async function streamLogs(
  components: CliComponents,
  logsUrl: string,
  authHeaders: Record<string, string>
): Promise<void> {
  const { logger, fetch: fetchComponent } = components

  logger.info('\nConnecting to server logs...')

  try {
    const response = await fetchComponent.fetch(logsUrl, {
      method: 'GET',
      headers: {
        ...authHeaders,
        Accept: 'text/event-stream'
      }
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Server returned ${response.status}: ${errorText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/event-stream') && !contentType.includes('application/stream')) {
      throw new Error('Server does not support SSE streaming')
    }

    logger.info('Streaming logs in real-time (press CTRL+C to stop)')

    if (response.body) {
      const decoder = new TextDecoder()
      let buffer = ''

      for await (const chunk of response.body) {
        buffer += decoder.decode(chunk, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            formatAndPrintLog(logger, line)
          }
        }
      }
    }

    logger.info('\n======================= End Scene Logs =======================')
  } catch (e) {
    printError(logger, 'Failed to stream logs:', e as Error)
    process.exit(1)
  }
}

function formatAndPrintLog(logger: CliComponents['logger'], log: any) {
  // If log is a string, try to parse as JSON
  let logObj = log
  if (typeof log === 'string') {
    try {
      logObj = JSON.parse(log)
    } catch {
      // If not JSON, just print the string
      logger.log(log)
      return
    }
  }

  // Extract common log fields
  const timestamp = logObj.timestamp || logObj.time || new Date().toISOString()
  const level = (logObj.level || logObj.severity || 'INFO').toUpperCase()
  const message = logObj.message || logObj.msg || JSON.stringify(logObj)

  // Format timestamp
  const date = new Date(timestamp)
  const formattedTime = date.toISOString().replace('T', ' ').substring(0, 19)

  // Format the log message with timestamp
  const formattedMessage = `[${formattedTime}] [${level}] ${message}`

  // Map log levels to logger methods
  const normalizedLevel = level.toLowerCase()

  switch (normalizedLevel) {
    case 'error':
      logger.error(formattedMessage)
      break
    case 'warn':
    case 'warning':
      logger.warn(formattedMessage)
      break
    case 'debug':
      logger.debug(formattedMessage)
      break
    case 'info':
    case 'trace':
    default:
      logger.info(formattedMessage)
      break
  }

  // If there are additional fields, print them
  const additionalFields = Object.keys(logObj).filter(
    (key) => !['timestamp', 'time', 'level', 'severity', 'message', 'msg'].includes(key)
  )
  if (additionalFields.length > 0) {
    const additional: any = {}
    additionalFields.forEach((key) => {
      additional[key] = logObj[key]
    })
    logger.log(`  ${JSON.stringify(additional)}`)
  }
}

function normalizePosition(raw: string): string {
  const match = raw.trim().match(/^(-?\d+)\s*,\s*(-?\d+)$/)
  if (!match) {
    throw new CliError(
      'SERVER_LOGS_INVALID_POSITION',
      `Invalid --position "${raw}"; expected "x,y" with integer coordinates`
    )
  }
  return `${parseInt(match[1], 10)},${parseInt(match[2], 10)}`
}

interface LogsRequest {
  /** Full URL the client will fetch. */
  logsUrl: string
  /** Pathname-only portion, used when signing. */
  pathname: string
  /** JSON string carried in the signed `x-identity-metadata` header. */
  metadata: string
}

/**
 * Build the HTTP request shape for a given target.
 *
 * Three shapes map to three CLI use cases:
 *   - world only                → `/logs/:world`                 (single-scene)
 *   - world + position          → `/logs/:world?position=x,y`    (multi-scene world)
 *   - position only (no world)  → `/logs` with parcel in metadata (Genesis City)
 *
 * The parcel is also included in the signed `x-identity-metadata` whenever it
 * is known. Query strings are not part of the signed payload, so carrying the
 * parcel in metadata keeps it authoritative and aligns with other signed-fetch
 * emitters (hammurabi worker, unity explorer, kernel) that always ship
 * `parcel` alongside the request.
 */
function buildLogsRequest(baseURL: string, world: string | undefined, position: string | undefined): LogsRequest {
  const metadata = JSON.stringify(position ? { parcel: position } : {})

  if (world) {
    const query = position ? `?position=${encodeURIComponent(position)}` : ''
    return {
      logsUrl: `${baseURL}/logs/${world}${query}`,
      pathname: `/logs/${world}`,
      metadata
    }
  }

  return {
    logsUrl: `${baseURL}/logs`,
    pathname: '/logs',
    metadata
  }
}

export async function main(options: Options) {
  const { logger } = options.components
  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')

  // Validate workspace exists
  await getValidWorkspace(options.components, projectRoot)

  const positionArg = options.args['--position']
  const worldArg = options.args['--world']

  let position = positionArg ? normalizePosition(positionArg) : undefined
  let world: string | undefined

  if (worldArg) {
    world = worldArg.replace(/\.dcl\.eth$/i, '')
  } else if (!position) {
    // Genesis City callers do not set --world. Otherwise fall back to scene.json.
    const sceneJson = await getValidSceneJson(options.components, projectRoot)
    const worldName = sceneJson.worldConfiguration?.name
    if (!worldName) {
      throw new CliError(
        'SERVER_LOGS_MISSING_WORLD',
        'Provide --world (with optional --position) for worlds, or --position alone for Genesis City scenes. ' +
          'Alternatively, run from a project whose scene.json defines worldConfiguration.name.'
      )
    }
    world = worldName.replace(/\.dcl\.eth$/i, '')
    // Default position to the scene's base parcel so signed metadata always
    // carries the parcel — consistent with other signed-fetch emitters.
    if (!position && sceneJson.scene?.base) {
      position = normalizePosition(sceneJson.scene.base)
    }
  }

  if (world) {
    logger.info(
      position
        ? `Viewing logs for world: ${world} at position ${position}`
        : `Viewing logs for world: ${world}`
    )
  } else {
    logger.info(`Viewing logs for Genesis City scene at position ${position!}`)
  }

  const baseURL = options.args['--target'] || DEFAULT_SERVER
  const { logsUrl, pathname, metadata } = buildLogsRequest(baseURL, world, position)

  // Linker dApp options
  const linkerPort = options.args['--port']
  const openBrowser = !options.args['--no-browser']
  const isHttps = !!options.args['--https']
  const linkOptions = { linkerPort, openBrowser, isHttps }

  const awaitResponse = future<void>()
  const timestamp = String(Date.now())

  // Build the payload to sign: method:path:timestamp:metadata
  const payload = ['get', pathname, timestamp, metadata].join(':').toLowerCase()

  let authHeaders: Record<string, string> = {}

  const { program } = await getAddressAndSignature(
    options.components,
    awaitResponse,
    payload,
    world,
    baseURL,
    linkOptions,
    async (linkerResponse) => {
      authHeaders = createAuthChainHeaders(linkerResponse.authChain, timestamp, metadata)
    }
  )

  try {
    await awaitResponse
    logger.info('Authentication successful!')

    // Close the browser window
    if (program) {
      await program.stop()
    }

    // Start streaming logs
    await streamLogs(options.components, logsUrl, authHeaders)
  } catch (e) {
    printError(logger, 'Failed to authenticate:', e as Error)
    throw e
  } finally {
    if (program) {
      void program.stop()
    }
  }
}
