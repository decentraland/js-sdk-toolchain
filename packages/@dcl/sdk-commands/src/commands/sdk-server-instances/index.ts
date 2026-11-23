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
  '--stop': String,
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

interface WorldInstance {
  sceneId: string
  baseParcel?: string
  participants: number
}

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands sdk-server-instances [options]'
    Lists the multiplayer server instances running for a world, or stops one.
    Only the world owner and collaborators allowed to deploy anywhere in it can use it.
    Falls back to scene.json (worldConfiguration.name) when --world is not passed.

    Options:
      -h, --help                Displays complete help
      -w, --world       [name]  World name
      --stop       [sceneId]    Stop the instance with this sceneId. Players still in the
                                world get a fresh instance on their next join.
      -t, --target      [URL]   Target multiplayer server URL (default: ${DEFAULT_SERVER})
      --dir             [path]  Path to the project directory (used with scene.json fallback)
      -p, --port        [port]  Select a custom port for the linker dApp
      -b, --no-browser          Do not open a new browser window
      --https                   Use HTTPS for the linker dApp

    Examples:
    - List the instances of the world in the current scene.json:
      $ sdk-commands sdk-server-instances

    - List the instances of a world:
      $ sdk-commands sdk-server-instances --world myworld.dcl.eth

    - Stop one of them:
      $ sdk-commands sdk-server-instances --world myworld.dcl.eth --stop bafkrei...

    - Use private key for authentication (no browser):
      $ DCL_PRIVATE_KEY=0x... sdk-commands sdk-server-instances --world myworld
`)
}

async function resolveWorldName(options: Options): Promise<string> {
  const worldArg = options.args['--world']
  if (worldArg)
    return worldArg
      .trim()
      .toLowerCase()
      .replace(/\.dcl\.eth$/, '')

  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')
  await getValidWorkspace(options.components, projectRoot)
  const sceneJson = await getValidSceneJson(options.components, projectRoot)
  const worldName = sceneJson.worldConfiguration?.name
  if (!worldName) {
    throw new CliError(
      'SERVER_INSTANCES_MISSING_WORLD',
      'Provide --world, or run from a project whose scene.json defines worldConfiguration.name.'
    )
  }
  return worldName.toLowerCase().replace(/\.dcl\.eth$/, '')
}

/**
 * Builds the crypto-middleware 6.x signed payload: method, path and timestamp lowercased,
 * metadata verbatim.
 */
export function buildSignedPayload(method: string, pathname: string, timestamp: string, metadata: string): string {
  return [method.toLowerCase(), pathname.toLowerCase(), timestamp, metadata].join(':')
}

async function readError(response: Awaited<ReturnType<CliComponents['fetch']['fetch']>>): Promise<string> {
  const text = await response.text()
  try {
    return (JSON.parse(text) as { error?: string }).error ?? text
  } catch {
    return text
  }
}

export async function main(options: Options) {
  const { logger, fetch } = options.components

  const world = `${await resolveWorldName(options)}.dcl.eth`
  const sceneId = options.args['--stop']
  if (sceneId !== undefined && !SCENE_ID_PATTERN.test(sceneId)) {
    throw new CliError('SERVER_INSTANCES_INVALID_SCENE_ID', `Invalid --stop "${sceneId}"; expected a scene entity hash`)
  }

  const method = sceneId ? 'DELETE' : 'GET'
  const pathname = `/worlds/${encodeURIComponent(world)}/instances${sceneId ? `/${sceneId}` : ''}`
  const baseURL = (options.args['--target'] || DEFAULT_SERVER).replace(/\/+$/, '')
  const timestamp = String(Date.now())
  const metadata = '{}'

  const headers = await signMultiplayerServerRequest(options.components, {
    payload: buildSignedPayload(method, pathname, timestamp, metadata),
    timestamp,
    metadata,
    displayLabel: world,
    targetUrl: baseURL,
    linkOptions: {
      linkerPort: options.args['--port'],
      openBrowser: !options.args['--no-browser'],
      isHttps: !!options.args['--https']
    },
    prompt: sceneId
      ? `You need to sign to stop instance ${sceneId} of ${world}`
      : `You need to sign to list the server instances of ${world}`
  })

  let response: Awaited<ReturnType<CliComponents['fetch']['fetch']>>
  try {
    response = await fetch.fetch(`${baseURL}${pathname}`, { method, headers })
  } catch (e) {
    throw new CliError('SERVER_INSTANCES_REQUEST_FAILED', `Could not reach ${baseURL}: ${(e as Error).message}`)
  }
  if (!response.ok) {
    throw new CliError(
      'SERVER_INSTANCES_REQUEST_FAILED',
      `Server returned ${response.status}: ${await readError(response)}`
    )
  }

  if (sceneId) {
    logger.info(`Stopped instance ${sceneId} of ${world}`)
    return
  }

  const { instances } = (await response.json()) as { instances: WorldInstance[] }
  if (instances.length === 0) {
    logger.info(`No server instances running for ${world}`)
    return
  }

  logger.info(`Server instances running for ${world}:`)
  for (const instance of instances) {
    logger.log(`  ${instance.sceneId}  parcel ${instance.baseParcel ?? '-'}  ${instance.participants} player(s)`)
  }
}
