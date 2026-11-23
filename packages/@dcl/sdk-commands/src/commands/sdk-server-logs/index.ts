import { resolve } from 'path'
import { Result } from 'arg'

import { declareArgs } from '../../logic/args'
import { CliComponents } from '../../components'
import { CliError } from '../../logic/error'
import { printError } from '../../logic/beautiful-logs'
import { signMultiplayerServerRequest } from '../../logic/multiplayer-server-auth'
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
    For persisted logs, use sdk-commands scene-insights tail --for 30s.
    With scene-insights, --target points to the Insights service, not this server.
    Runs from any directory when --world and/or --position are provided.
    Falls back to scene.json (worldConfiguration.name) when neither is passed.

    Options:
      -h, --help                Displays complete help
      -w, --world       [name]  World name. When omitted, --position targets Genesis City.
      --position        [x,y]   Parcel coordinates. Optional for worlds (selects a scene
                                in a multi-scene world). Required for Genesis City.
      -t, --target      [URL]   Target multiplayer server URL (default: ${DEFAULT_SERVER})
      --dir             [path]  Path to the project directory (used with scene.json fallback)
      -p, --port        [port]  Select a custom port for the linker dApp
      -b, --no-browser          Do not open a new browser window
      --https                   Use HTTPS for the linker dApp

    Examples:
    - View logs using the world in the current scene.json:
      $ sdk-commands sdk-server-logs

    - View logs for a world from any directory:
      $ sdk-commands sdk-server-logs --world myworld.dcl.eth

    - View logs for a specific scene in a multi-scene world:
      $ sdk-commands sdk-server-logs --world myworld.dcl.eth --position 10,10

    - View logs for a Genesis City scene (use =value form for negative coords):
      $ sdk-commands sdk-server-logs --position=-125,-96

    - Connect to a custom server:
      $ sdk-commands sdk-server-logs --world myworld --target https://multiplayer-server.decentraland.zone

    - Use private key for authentication (no browser):
      $ DCL_PRIVATE_KEY=0x... sdk-commands sdk-server-logs --world myworld
`)
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
  logsUrl: string
  pathname: string
  metadata: string
}

/**
 * Build the HTTP request shape for the multiplayer-server `/logs` endpoint.
 *
 * Every call targets the same `/logs` route; the server picks the scene from
 * the signed metadata:
 *   - worlds  → `sceneId: "<world>.dcl.eth"` (+ `parcel` for multi-scene worlds)
 *   - Genesis → `parcel: "x,y"` only
 *
 * `parcel` and `realmName` are always set. `realmName` defaults to `"main"` for
 * Genesis, matching the convention used by other signed-fetch emitters
 * (hammurabi worker, unity explorer, kernel).
 */
function buildLogsRequest(baseURL: string, world: string | undefined, position: string | undefined): LogsRequest {
  const metadata = JSON.stringify({
    parcel: position ?? '0,0',
    realmName: world ? `${world}.dcl.eth` : 'main',
    ...(world && { sceneId: `${world}.dcl.eth` })
  })

  return {
    logsUrl: `${baseURL}/logs`,
    pathname: '/logs',
    metadata
  }
}

export async function main(options: Options) {
  const { logger } = options.components
  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')

  const positionArg = options.args['--position']
  const worldArg = options.args['--world']

  const position = positionArg ? normalizePosition(positionArg) : undefined
  let world: string | undefined

  if (worldArg) {
    world = worldArg.replace(/\.dcl\.eth$/i, '')
  } else if (!position) {
    // no --world nor --position: fall back to scene.json in the current directory
    await getValidWorkspace(options.components, projectRoot)
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
  }

  const displayLabel = world
    ? position
      ? `${world}.dcl.eth ${position}`
      : `${world}.dcl.eth`
    : `Genesis City ${position}`

  logger.info(`Viewing logs for ${displayLabel}`)

  const baseURL = options.args['--target'] || DEFAULT_SERVER
  const { logsUrl, pathname, metadata } = buildLogsRequest(baseURL, world, position)

  // Linker dApp options
  const linkerPort = options.args['--port']
  const openBrowser = !options.args['--no-browser']
  const isHttps = !!options.args['--https']
  const linkOptions = { linkerPort, openBrowser, isHttps }

  const timestamp = String(Date.now())

  // Build the payload to sign: method:path:timestamp:metadata
  const payload = ['get', pathname, timestamp, metadata].join(':').toLowerCase()

  let authHeaders: Record<string, string>
  try {
    authHeaders = await signMultiplayerServerRequest(options.components, {
      payload,
      timestamp,
      metadata,
      displayLabel,
      targetUrl: baseURL,
      linkOptions,
      prompt: 'You need to sign to access server logs'
    })
    logger.info('Authentication successful!')
  } catch (e) {
    printError(logger, 'Failed to authenticate:', e as Error)
    throw e
  }

  await streamLogs(options.components, logsUrl, authHeaders)
}
