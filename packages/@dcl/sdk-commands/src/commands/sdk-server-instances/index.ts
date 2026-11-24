import { resolve } from 'path'
import { Result } from 'arg'

import { declareArgs } from '../../logic/args'
import { CliComponents } from '../../components'
import { CliError } from '../../logic/error'
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
  '--stop': String,
  '--stop-all': Boolean,
  '--target': String,
  '-t': '--target',
  '--port': Number,
  '-p': '--port',
  '--https': Boolean,
  '--no-browser': Boolean,
  '-b': '--no-browser'
})

const DEFAULT_SERVER = 'https://multiplayer-server.decentraland.org'
const SCENE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

/** A world (optionally one of its scenes, by parcel) or a Genesis City scene, by parcel. */
export interface InstancesScope {
  world?: string
  position?: string
}

interface ServerInstance {
  sceneId: string
  baseParcel?: string
  status?: string
  participants?: number
}

type FetchResponse = Awaited<ReturnType<CliComponents['fetch']['fetch']>>

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands sdk-server-instances [options]'
    Lists the multiplayer server instances running for a scene or a world, or stops them.
    Genesis City: needs LAND deploy rights on every parcel of the scene.
    Worlds: only the world owner and collaborators allowed to deploy anywhere in it.
    Without --world or --position, uses scene.json: the world in worldConfiguration.name,
    or else the Genesis City scene at its base parcel.

    Options:
      -h, --help                Displays complete help
      -w, --world       [name]  World name
      --position        [x,y]   A parcel of the scene: Genesis City alone, or one scene of the world
                                with --world (use the =value form for negative coordinates)
      --stop       [sceneId]    Stop the instance with this sceneId
      --stop-all                Stop every instance of the scene (needs --position in a world)
      -t, --target      [URL]   Target multiplayer server URL (default: ${DEFAULT_SERVER})
      --dir             [path]  Path to the project directory (used with scene.json fallback)
      -p, --port        [port]  Select a custom port for the linker dApp
      -b, --no-browser          Do not open a new browser window
      --https                   Use HTTPS for the linker dApp

    Stopped instances are not restarted: players in them stay without a server until they reload
    the scene, which starts a new one.

    Examples:
    - List the instances of the scene in the current directory:
      $ sdk-commands sdk-server-instances

    - List the instances of a world, or of one of its scenes:
      $ sdk-commands sdk-server-instances --world myworld.dcl.eth
      $ sdk-commands sdk-server-instances --world myworld.dcl.eth --position=10,10

    - List the instances of a Genesis City scene:
      $ sdk-commands sdk-server-instances --position=-125,-96

    - Stop one of them, or all of them:
      $ sdk-commands sdk-server-instances --world myworld.dcl.eth --stop bafkrei...
      $ sdk-commands sdk-server-instances --position=-125,-96 --stop-all

    - Use private key for authentication (no browser):
      $ DCL_PRIVATE_KEY=0x... sdk-commands sdk-server-instances --world myworld
`)
}

function toWorldName(raw: string): string {
  return `${raw
    .trim()
    .toLowerCase()
    .replace(/\.dcl\.eth$/, '')}.dcl.eth`
}

function normalizePosition(raw: string): string {
  const match = raw.trim().match(/^(-?\d+)\s*,\s*(-?\d+)$/)
  if (!match) {
    throw new CliError(
      'SERVER_INSTANCES_INVALID_ARGUMENT',
      `Invalid --position "${raw}"; expected "x,y" with integer coordinates`
    )
  }
  return `${parseInt(match[1], 10)},${parseInt(match[2], 10)}`
}

async function resolveScope(options: Options): Promise<InstancesScope> {
  const worldArg = options.args['--world']
  const positionArg = options.args['--position']
  const position = positionArg !== undefined ? normalizePosition(positionArg) : undefined
  if (worldArg) return { world: toWorldName(worldArg), position }
  if (position) return { position }

  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')
  await getValidWorkspace(options.components, projectRoot)
  const sceneJson = await getValidSceneJson(options.components, projectRoot)
  const worldName = sceneJson.worldConfiguration?.name
  if (worldName) return { world: toWorldName(worldName) }
  return { position: normalizePosition(sceneJson.scene.base) }
}

/** The instances collection of the scope. Parcels keep their comma: the server verifies the raw path. */
export function instancesPath(scope: InstancesScope): string {
  if (!scope.world) return `/scenes/${scope.position}/instances`
  const world = `/worlds/${encodeURIComponent(scope.world)}`
  return scope.position ? `${world}/scenes/${scope.position}/instances` : `${world}/instances`
}

function describeScope(scope: InstancesScope): string {
  if (!scope.world) return `Genesis City scene ${scope.position}`
  return scope.position ? `${scope.world} scene ${scope.position}` : scope.world
}

/**
 * Builds the crypto-middleware 6.x signed payload: method, path and timestamp lowercased,
 * metadata verbatim.
 */
export function buildSignedPayload(method: string, pathname: string, timestamp: string, metadata: string): string {
  return [method.toLowerCase(), pathname.toLowerCase(), timestamp, metadata].join(':')
}

async function readError(response: FetchResponse): Promise<string> {
  const text = await response.text()
  try {
    return (JSON.parse(text) as { error?: string }).error ?? text
  } catch {
    return text
  }
}

async function requestFailed(response: FetchResponse): Promise<CliError<'SERVER_INSTANCES_REQUEST_FAILED'>> {
  const message = `Server returned ${response.status}: ${await readError(response)}`
  // the signature only verifies for 60s after the CLI timestamps it, so a slow browser sign-in ends here
  const hint =
    response.status === 401 ? ' (signatures expire after a minute; run the command again and sign right away)' : ''
  return new CliError('SERVER_INSTANCES_REQUEST_FAILED', `${message}${hint}`)
}

async function readBody<T>(response: FetchResponse, field: keyof T, baseURL: string): Promise<T> {
  let body: unknown
  try {
    body = await response.json()
  } catch {
    body = undefined
  }
  if (!body || typeof body !== 'object' || !Array.isArray((body as Record<string, unknown>)[field as string])) {
    throw new CliError(
      'SERVER_INSTANCES_REQUEST_FAILED',
      `Unexpected response from ${baseURL}; check that --target is a multiplayer server`
    )
  }
  return body as T
}

export async function main(options: Options) {
  const { logger, fetch } = options.components

  const sceneId = options.args['--stop']
  const stopAll = !!options.args['--stop-all']
  if (sceneId !== undefined && stopAll) {
    throw new CliError('SERVER_INSTANCES_INVALID_ARGUMENT', 'Use either --stop or --stop-all, not both')
  }
  if (sceneId !== undefined && !SCENE_ID_PATTERN.test(sceneId)) {
    throw new CliError('SERVER_INSTANCES_INVALID_SCENE_ID', `Invalid --stop "${sceneId}"; expected a scene entity hash`)
  }

  const scope = await resolveScope(options)
  if (stopAll && scope.world && !scope.position) {
    throw new CliError(
      'SERVER_INSTANCES_MISSING_POSITION',
      'A world can have several scenes: pass --position with a parcel of the scene to stop, or --stop <sceneId>'
    )
  }
  const label = describeScope(scope)

  const method = sceneId || stopAll ? 'DELETE' : 'GET'
  const pathname = `${instancesPath(scope)}${sceneId ? `/${sceneId}` : ''}`
  const baseURL = (options.args['--target'] || DEFAULT_SERVER).replace(/\/+$/, '')
  const timestamp = String(Date.now())
  const metadata = '{}'

  const headers = await signMultiplayerServerRequest(options.components, {
    payload: buildSignedPayload(method, pathname, timestamp, metadata),
    timestamp,
    metadata,
    displayLabel: label,
    targetUrl: baseURL,
    linkOptions: {
      linkerPort: options.args['--port'],
      openBrowser: !options.args['--no-browser'],
      isHttps: !!options.args['--https']
    },
    prompt: sceneId
      ? `You need to sign to stop instance ${sceneId} of ${label}`
      : stopAll
        ? `You need to sign to stop every instance of ${label}`
        : `You need to sign to list the server instances of ${label}`
  })

  let response: FetchResponse
  try {
    response = await fetch.fetch(`${baseURL}${pathname}`, { method, headers })
  } catch (e) {
    throw new CliError('SERVER_INSTANCES_REQUEST_FAILED', `Could not reach ${baseURL}: ${(e as Error).message}`)
  }
  if (!response.ok) throw await requestFailed(response)

  if (sceneId) {
    logger.info(`Stopped instance ${sceneId} of ${label}`)
    return
  }

  if (stopAll) {
    const { stopped } = await readBody<{ stopped: string[] }>(response, 'stopped', baseURL)
    logger.info(`Stopped ${stopped.length} instance(s) of ${label}:`)
    for (const stoppedId of stopped) logger.log(`  ${stoppedId}`)
    return
  }

  const { instances } = await readBody<{ instances: ServerInstance[] }>(response, 'instances', baseURL)
  if (instances.length === 0) {
    logger.info(`No server instances running for ${label}`)
    return
  }

  logger.info(`Server instances running for ${label}:`)
  for (const instance of instances) {
    logger.log(
      `  ${instance.sceneId}  parcel ${instance.baseParcel ?? '-'}  ${instance.status ?? 'running'}  ${
        instance.participants ?? 0
      } player(s)`
    )
  }
}
