import { resolve } from 'path'
import { Result } from 'arg'

import { declareArgs } from '../../logic/args'
import { CliComponents } from '../../components'
import { CliError, CliErrorName } from '../../logic/error'
import { createWallet } from '../../logic/account'
import { getValidWorkspace } from '../../logic/workspace-validations'
import { getValidSceneJson } from '../../logic/scene-validations'
import { Output, runExecutions, runLogs, runMetrics, runTail } from './actions'
import { createInsightsClient } from './client'
import {
  SceneTarget,
  buildSceneTarget,
  normalizeMetricName,
  normalizeParcel,
  normalizeWorldName,
  parseDuration,
  parseInteger,
  parseLevel,
  parseTime
} from './inputs'
import { SESSION_DIR_ENV, deleteSession, getSessionFilePath, loadSession } from './session-store'
import { SessionOptions, getSession } from './sign-in'

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
  '-b': '--no-browser',
  '--from': String,
  '--to': String,
  '--level': String,
  '-l': '--level',
  '--source': String,
  '--query': String,
  '-q': '--query',
  '--execution': String,
  '--limit': Number,
  '-n': '--limit',
  '--order': String,
  '--lines': Number,
  '--for': String,
  '--step': Number,
  '--json': Boolean
})

const DEFAULT_SERVER = 'https://multiplayer-scenes-insights-service.decentraland.org'
const QUERY_SUBCOMMANDS = ['logs', 'tail', 'metrics', 'executions']
const SESSION_SUBCOMMANDS = ['login', 'logout', 'session']

/**
 * Exit codes, so a script or an agent can tell what to do next without parsing messages:
 * 2 fix the arguments, 3 have a person sign in, 4 use an address with access, 5 check the scene,
 * 6 try again later. Anything else exits with 1.
 */
export const EXIT_CODES: Partial<Record<CliErrorName, number>> = {
  SCENE_INSIGHTS_INVALID_ARGUMENT: 2,
  SCENE_INSIGHTS_MISSING_SCENE: 2,
  SCENE_INSIGHTS_UNSAFE_SESSION_FILE: 2,
  SCENE_INSIGHTS_SESSION_REQUIRED: 3,
  SCENE_INSIGHTS_UNAUTHORIZED: 3,
  SCENE_INSIGHTS_INVALID_SIGNATURE: 3,
  SCENE_INSIGHTS_UNSUPPORTED_WALLET: 3,
  SCENE_INSIGHTS_FORBIDDEN: 4,
  SCENE_INSIGHTS_NOT_FOUND: 5,
  SCENE_INSIGHTS_UNAVAILABLE: 6
}

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands scene-insights <subcommand> [options]'
    Reads the persisted logs and metrics of an authoritative multiplayer scene (kept for 7 days)
    from multiplayer-scenes-insights-service. The signed-in address must be in the scene's
    logsPermissions, or be the World's owner or a deployer.

    Sign in once with "login": it opens the browser for your wallet to sign, and the session is
    saved for 12 hours in ${getSessionFilePath()} (or in the .dcl folder of ${SESSION_DIR_ENV}).
    Until it expires it can sign Decentraland requests as your address; "logout" removes it.
    The .dcl folder is never deployed and ignores itself in git, so the session is never published.
    With DCL_PRIVATE_KEY set, requests are signed with that key and nothing is saved.
    Without a terminal (scripts, AI agents) a missing session is an error, never a browser prompt.

    Runs from any directory with --world and/or --position; otherwise reads scene.json
    (worldConfiguration.name and scene.base).

    Subcommands:
      login                     Sign in (always asks for a new signature)
      session                   Show the signed-in address and when the session expires
      logout                    Remove the saved session
      logs                      Search the logs; prints the newest --limit lines, oldest first
      tail                      Follow new log lines live (reconnects and resumes on its own)
      metrics [name]            List the metrics with data, or chart one (cpu.run_ms is short
                                for dcl.scene.cpu.run_ms)
      executions                List the scene's executions (deployments and restarts)

    Scene:
      -w, --world       [name]  World name (myworld, myworld.dcl.eth or any ENS name)
      --position        [x,y]   A parcel of the scene: Genesis City, or one scene of a multi-scene
                                World (use the =value form for negative coordinates)
      --dir             [path]  Project directory for the scene.json fallback

    Time range (logs, metrics, executions):
      --from            [time]  Start: a duration back from now (15m, 2h, 7d), epoch ms, or
                                ISO-8601 with an offset. Default: 1 hour ago (24 hours for
                                metric names and executions)
      --to              [time]  End, same formats. Default: now

    logs:
      -l, --level       [level] Minimum level: debug, info, warn or error
      -q, --query       [text]  Literal text to match (case-insensitive)
      --source          [list]  Comma-separated sources: scene, engine, stderr
      --execution       [id]    Only this execution (see "executions")
      -n, --limit       [n]     Lines to print, 1-10000 (default 100)
      --order           [order] desc (default) prints the newest lines, asc the oldest

    tail:
      --for             [time]  Stop after this long (30s, 5m); default: until CTRL+C
      --lines           [n]     Replay the newest n lines first, 0-1000 (default 0)
      -l, --level, -q, --query  Filter the followed lines

    metrics:
      --step            [s]     Bucket width in seconds, 10-86400 (default: ~300 buckets)
      --execution       [id]    Only this execution

    Other options:
      --json                    Print JSON to stdout (one object per log line), and errors as
                                {"error":{"code","message","exitCode"}} on stderr
      -t, --target      [URL]   Insights service URL (default: ${DEFAULT_SERVER})
      -p, --port        [port]  Select a custom port for the linker dApp
      -b, --no-browser          Do not open a new browser window
      --https                   Use HTTPS for the linker dApp
      -h, --help                Displays complete help

    Exit codes:
      0 success, 1 other failure, 2 invalid arguments, 3 sign-in needed (run login),
      4 the address has no access to the scene, 5 scene not found, 6 service unavailable

    Examples:
    - Sign in, then read the errors of the last 6 hours of the World in scene.json:
      $ sdk-commands scene-insights login
      $ sdk-commands scene-insights logs --from 6h --level error

    - Search a World from any directory:
      $ sdk-commands scene-insights logs --world myworld --query "player joined" --limit 500

    - Follow a Genesis City scene for 2 minutes, replaying the last 50 lines:
      $ sdk-commands scene-insights tail --position=-125,-96 --lines 50 --for 2m

    - Chart heap usage over the last day, one point per 10 minutes:
      $ sdk-commands scene-insights metrics mem.heap_used --from 1d --step 600

    - Use the development (.zone) service, signing with a private key:
      $ DCL_PRIVATE_KEY=0x... sdk-commands scene-insights executions --world myworld \\
          --target https://multiplayer-scenes-insights-service.decentraland.zone
`)
}

/** Resolves the scene from --world/--position, falling back to scene.json. */
async function resolveTarget(options: Options): Promise<SceneTarget> {
  const worldArg = options.args['--world']
  const positionArg = options.args['--position']
  if (worldArg || positionArg) {
    return buildSceneTarget(
      worldArg ? normalizeWorldName(worldArg) : undefined,
      positionArg ? normalizeParcel(positionArg) : undefined
    )
  }

  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')
  await getValidWorkspace(options.components, projectRoot)
  const sceneJson = await getValidSceneJson(options.components, projectRoot)
  const world = sceneJson.worldConfiguration?.name
  const base = sceneJson.scene?.base
  return buildSceneTarget(world ? normalizeWorldName(world) : undefined, base ? normalizeParcel(base) : undefined)
}

/**
 * Runs a subcommand. With --json it returns the result for the CLI to print as JSON (the tail
 * streams its own JSON lines and returns nothing), and an error is written as JSON on stderr.
 */
export async function main(options: Options): Promise<unknown> {
  const json = !!options.args['--json']
  try {
    return await run(options)
  } catch (error) {
    if (!(error instanceof CliError)) throw error
    process.exitCode = EXIT_CODES[error.name as CliErrorName] ?? 1
    if (!json) throw error
    process.stderr.write(
      JSON.stringify({ error: { code: error.name, message: error.message, exitCode: process.exitCode } }) + '\n'
    )
  }
}

async function run(options: Options): Promise<unknown> {
  const { components } = options
  const a = options.args

  const [subcommand, positional] = a._.filter((arg) => !arg.startsWith('-'))
  if (!subcommand || ![...QUERY_SUBCOMMANDS, ...SESSION_SUBCOMMANDS].includes(subcommand)) {
    throw new CliError(
      'SCENE_INSIGHTS_INVALID_ARGUMENT',
      `${subcommand ? `Unknown subcommand "${subcommand}"` : 'Missing subcommand'}. Use: ` +
        `${[...SESSION_SUBCOMMANDS, ...QUERY_SUBCOMMANDS].join(', ')}\n` +
        'Run "sdk-commands scene-insights --help" for more information.'
    )
  }

  const baseUrl = a['--target'] || DEFAULT_SERVER
  const file = getSessionFilePath()
  const write = (line: string) => process.stdout.write(line + '\n')
  const sessionOptions: SessionOptions = {
    file,
    targetUrl: baseUrl,
    linkOptions: { linkerPort: a['--port'], openBrowser: !a['--no-browser'], isHttps: !!a['--https'] },
    interactive: !!process.stdin.isTTY
  }

  if (subcommand === 'logout') {
    const removed = await deleteSession(components, file)
    components.logger.info(removed ? `Signed out; removed ${file}` : 'There was no saved session')
    return { removed, file }
  }

  if (subcommand === 'session') {
    if (process.env.DCL_PRIVATE_KEY) {
      const { address } = createWallet(process.env.DCL_PRIVATE_KEY)
      if (!a['--json']) write(`Signing as ${address} with DCL_PRIVATE_KEY`)
      return { address, expiration: null, source: 'DCL_PRIVATE_KEY' }
    }
    const saved = await loadSession(components, file)
    if (!saved) {
      throw new CliError('SCENE_INSIGHTS_SESSION_REQUIRED', 'Not signed in; run "sdk-commands scene-insights login"')
    }
    const { address, expiration } = saved.session
    if (!a['--json']) write(`Signed in as ${address} until ${expiration.toISOString()} (${file})`)
    return { address, expiration: expiration.toISOString(), source: file }
  }

  if (subcommand === 'login') {
    const { session, source } = await getSession(
      components,
      { label: 'scene insights' },
      { ...sessionOptions, interactive: true, forceNew: true }
    )
    if (source === 'private-key') {
      components.logger.info(`DCL_PRIVATE_KEY is set: requests are signed as ${session.address}, nothing to save`)
      return { address: session.address, expiration: null, source: 'DCL_PRIVATE_KEY' }
    }
    components.logger.info(
      `Signed in as ${session.address} until ${session.expiration.toISOString()}; saved to ${file}`
    )
    return { address: session.address, expiration: session.expiration.toISOString(), source: file }
  }

  // validate every flag before resolving the scene or signing
  const from = a['--from'] ? parseTime(a['--from'], '--from') : undefined
  const to = a['--to'] ? parseTime(a['--to'], '--to') : undefined
  const level = a['--level'] ? parseLevel(a['--level']) : undefined
  const order = a['--order'] ?? 'desc'
  if (order !== 'asc' && order !== 'desc') {
    throw new CliError('SCENE_INSIGHTS_INVALID_ARGUMENT', '--order must be asc or desc')
  }
  const limit = parseInteger(a['--limit'] ?? 100, '--limit', 1, 10_000)
  const lines = a['--lines'] !== undefined ? parseInteger(a['--lines'], '--lines', 0, 1000) : undefined
  const followFor = a['--for'] !== undefined ? parseDuration(a['--for'], '--for') : undefined
  const step = a['--step'] !== undefined ? parseInteger(a['--step'], '--step', 10, 86_400) : undefined
  const query = a['--query']
  if (query !== undefined && (query.length < 1 || query.length > 256)) {
    throw new CliError('SCENE_INSIGHTS_INVALID_ARGUMENT', '--query must be 1 to 256 characters')
  }
  const metric = positional ? normalizeMetricName(positional) : undefined

  const target = await resolveTarget(options)
  components.logger.info(`Scene insights for ${target.label} (${baseUrl})`)

  const { session } = await getSession(components, target, sessionOptions)
  components.logger.info(`Signed in as ${session.address}`)

  const client = createInsightsClient(components, baseUrl, session, target.metadata)
  const output: Output = {
    write,
    note: (message) => components.logger.info(message),
    json: !!a['--json'],
    color: !!process.stdout.isTTY && !process.env.NO_COLOR && process.env.FORCE_COLOR !== '0'
  }
  const common = { from, to }

  switch (subcommand) {
    case 'logs':
      return runLogs(
        client,
        { ...common, level, source: a['--source'], query, execution: a['--execution'], limit, order },
        output
      )
    case 'tail': {
      const controller = new AbortController()
      process.once('SIGINT', () => controller.abort())
      const timer = followFor !== undefined ? setTimeout(() => controller.abort(), followFor) : undefined
      try {
        return await runTail(client, { lines, level, query, signal: controller.signal }, output)
      } finally {
        clearTimeout(timer)
      }
    }
    case 'metrics':
      return runMetrics(client, { ...common, metric, step, execution: a['--execution'] }, output)
    case 'executions':
      return runExecutions(client, common, output)
  }
}
