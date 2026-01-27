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
  '--target': String,
  '-t': '--target',
  '--port': Number,
  '-p': '--port',
  '--https': Boolean,
  '--no-browser': Boolean,
  '-b': '--no-browser'
})

const DEFAULT_SERVER = 'https://multiplayer-server.decentraland.zone'

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands sdk-server-logs [options]'
    Streams real-time logs from the multiplayer server for your world.
    Requires --world parameter or a scene.json with worldConfiguration.name.

    Options:
      -h, --help                Displays complete help
      -w, --world       [name]  World name (required, or uses scene.json)
      -t, --target      [URL]   Target multiplayer server URL (default: ${DEFAULT_SERVER})
      --dir             [path]  Path to the project directory
      -p, --port        [port]  Select a custom port for the linker dApp
      -b, --no-browser          Do not open a new browser window
      --https                   Use HTTPS for the linker dApp

    Examples:
    - View logs for world in scene.json:
      $ sdk-commands sdk-server-logs

    - View logs for a specific world:
      $ sdk-commands sdk-server-logs --world myworld
      $ sdk-commands sdk-server-logs -w myworld.dcl.eth

    - View logs for staging world:
      $ sdk-commands sdk-server-logs --world staging-world

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

  router.post('/api/deploy', async (ctx) => {
    const value = (await ctx.request.json()) as LinkerResponse

    if (!value.address || !value.authChain) {
      const errorMessage = `Invalid payload: ${Object.keys(value).join(' - ')}`
      logger.error(errorMessage)
      resolveLinkerPromise()
      return { status: 400, body: { message: errorMessage } }
    }

    try {
      await signCallback(value)
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
  payload: string,
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
    isWorld: true
  })
  const router = setServerLogsRoutes(commonRouter, components, awaitResponse, signCallback)

  components.logger.info(`You need to sign to access server logs:`)
  const { program } = await runDapp(components, router, { ...linkOptions, uri: `/` })

  return { program }
}

async function streamLogs(
  components: CliComponents,
  logsUrl: string,
  authHeaders: Record<string, string>
): Promise<void> {
  const { logger, fetch: fetchComponent } = components

  logger.info(`\n📡 Connecting to server logs...`)
  logger.info(`URL: ${logsUrl}`)

  // Debug: Log the headers being sent
  logger.info(`\nAuth Headers:`)
  Object.keys(authHeaders).forEach((key) => {
    logger.info(`  ${key}: ${authHeaders[key]}`)
  })

  logger.info('')

  // Try SSE/streaming first
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
      logger.error(`Server error response (${response.status}): ${errorText}`)
      throw new Error(`Server returned ${response.status}: ${errorText}`)
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType.includes('text/event-stream') || contentType.includes('application/stream')) {
      logger.info(`Streaming logs in real-time (press CTRL+C to stop)...\n`)

      // Stream logs
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
      return
    }
  } catch (e) {
    logger.warn(`Streaming not available, falling back to polling: ${(e as Error).message}`)
  }

  // Fall back to polling
  logger.info(`📊 Polling logs every 5 seconds (press CTRL+C to stop)...\n`)

  let lastTimestamp: number = Date.now()
  let consecutiveErrors = 0
  const maxErrors = 3

  const pollLogs = async () => {
    try {
      const response = await fetchComponent.fetch(`${logsUrl}?since=${lastTimestamp}`, {
        method: 'GET',
        headers: authHeaders
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Server returned ${response.status}: ${errorText}`)
      }

      const data = (await response.json()) as any
      const logs = Array.isArray(data) ? data : data.logs || []

      if (logs.length > 0) {
        logs.forEach((log: any) => {
          formatAndPrintLog(logger, log)
          // Update lastTimestamp if log has timestamp
          if (log.timestamp) {
            lastTimestamp = Math.max(lastTimestamp, new Date(log.timestamp).getTime())
          }
        })
      }

      consecutiveErrors = 0
    } catch (e) {
      consecutiveErrors++
      if (consecutiveErrors >= maxErrors) {
        printError(logger, 'Failed to fetch logs after multiple attempts:', e as Error)
        process.exit(1)
      } else {
        logger.warn(`Failed to fetch logs (${consecutiveErrors}/${maxErrors}): ${(e as Error).message}`)
      }
    }
  }

  // Initial poll
  await pollLogs()

  // Set up polling interval
  const intervalId = setInterval(pollLogs, 5000)

  // Handle graceful shutdown
  const cleanup = () => {
    clearInterval(intervalId)
    logger.info('\n\n✋ Stopped streaming logs')
    process.exit(0)
  }

  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)

  // Keep process alive
  await new Promise(() => {})
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

  // Color-code based on level
  const colors = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m', // Yellow
    WARNING: '\x1b[33m', // Yellow
    INFO: '\x1b[37m', // White
    DEBUG: '\x1b[36m', // Cyan
    TRACE: '\x1b[90m' // Gray
  }

  const reset = '\x1b[0m'
  const color = colors[level as keyof typeof colors] || colors.INFO

  // Format timestamp
  const date = new Date(timestamp)
  const formattedTime = date.toISOString().replace('T', ' ').substring(0, 19)

  // Print formatted log
  logger.log(`${color}[${formattedTime}] [${level}]${reset} ${message}`)

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

export async function main(options: Options) {
  const { logger } = options.components
  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')

  // Validate workspace exists
  await getValidWorkspace(options.components, projectRoot)

  let world: string

  // Check if --world parameter is provided
  if (options.args['--world']) {
    // Use the world from command line argument
    world = options.args['--world'].replace(/\.dcl\.eth$/i, '')
    logger.info(`World: ${world}`)
  } else {
    // Fall back to scene.json
    const sceneJson = await getValidSceneJson(options.components, projectRoot)

    // worldConfiguration.name is required if --world is not provided
    const worldName = sceneJson.worldConfiguration?.name
    if (!worldName) {
      throw new CliError(
        'SERVER_LOGS_MISSING_WORLD',
        'scene.json must have worldConfiguration.name defined, or provide --world parameter to view server logs'
      )
    }

    // Strip .dcl.eth suffix if present
    world = worldName.replace(/\.dcl\.eth$/i, '')
    logger.info(`World: ${world}`)
  }

  // Determine target URL
  const baseURL = options.args['--target'] || DEFAULT_SERVER

  // Build the logs URL
  const logsUrl = `${baseURL}/logs/${world}`

  // Build the pathname for signing
  const pathname = `/logs/${world}`

  // Linker dApp options
  const linkerPort = options.args['--port']
  const openBrowser = !options.args['--no-browser']
  const isHttps = !!options.args['--https']
  const linkOptions = { linkerPort, openBrowser, isHttps }

  const awaitResponse = future<void>()
  const timestamp = String(Date.now())
  const metadata = JSON.stringify({})

  // Build the payload to sign: method:path:timestamp:metadata
  const payload = ['get', pathname, timestamp, metadata].join(':').toLowerCase()

  let authHeaders: Record<string, string> = {}

  const { program } = await getAddressAndSignature(
    options.components,
    awaitResponse,
    payload,
    linkOptions,
    async (linkerResponse) => {
      authHeaders = createAuthChainHeaders(linkerResponse.authChain, timestamp, metadata)
    }
  )

  try {
    await awaitResponse
    logger.info('✅ Authentication successful!')

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
