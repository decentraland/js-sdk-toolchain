import { resolve } from 'path'
import { Result } from 'arg'

import { declareArgs } from '../../logic/args'
import { CliComponents } from '../../components'
import { CliError } from '../../logic/error'
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
  parseInteger,
  parseLevel,
  parseTime
} from './inputs'
import { openSession } from './session'

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
  '--step': Number,
  '--json': Boolean
})

const DEFAULT_SERVER = 'https://multiplayer-scenes-insights-service.decentraland.org'
const SUBCOMMANDS = ['logs', 'tail', 'metrics', 'executions']

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands scene-insights <logs|tail|metrics|executions> [options]'
    Reads the persisted logs and metrics of an authoritative multiplayer scene (kept for 7 days)
    from multiplayer-scenes-insights-service. You need to be in the scene's logsPermissions, or be
    the World's owner or a deployer.

    You sign once (in the browser, or with DCL_PRIVATE_KEY) and the session lasts 12 hours.
    Runs from any directory with --world and/or --position; otherwise reads scene.json
    (worldConfiguration.name and scene.base).

    Subcommands:
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
      --lines           [n]     Replay the newest n lines first, 0-1000 (default 0)
      -l, --level, -q, --query  Filter the followed lines

    metrics:
      --step            [s]     Bucket width in seconds, 10-86400 (default: ~300 buckets)
      --execution       [id]    Only this execution

    Other options:
      --json                    Print JSON (one log line per line) for scripts
      -t, --target      [URL]   Insights service URL (default: ${DEFAULT_SERVER})
      -p, --port        [port]  Select a custom port for the linker dApp
      -b, --no-browser          Do not open a new browser window
      --https                   Use HTTPS for the linker dApp
      -h, --help                Displays complete help

    Examples:
    - Errors of the last 6 hours of the World in scene.json:
      $ sdk-commands scene-insights logs --from 6h --level error

    - Search a World from any directory:
      $ sdk-commands scene-insights logs --world myworld --query "player joined" --limit 500

    - Follow a Genesis City scene, replaying the last 50 lines:
      $ sdk-commands scene-insights tail --position=-125,-96 --lines 50

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

export async function main(options: Options) {
  const { components } = options
  const a = options.args

  const [subcommand, positional] = a._.filter((arg) => !arg.startsWith('-'))
  if (!subcommand || !SUBCOMMANDS.includes(subcommand)) {
    throw new CliError(
      'SCENE_INSIGHTS_INVALID_ARGUMENT',
      `${subcommand ? `Unknown subcommand "${subcommand}"` : 'Missing subcommand'}. Use: ${SUBCOMMANDS.join(', ')}\n` +
        'Run "sdk-commands scene-insights --help" for more information.'
    )
  }

  // validate every flag before asking for a signature
  const from = a['--from'] ? parseTime(a['--from'], '--from') : undefined
  const to = a['--to'] ? parseTime(a['--to'], '--to') : undefined
  const level = a['--level'] ? parseLevel(a['--level']) : undefined
  const order = a['--order'] ?? 'desc'
  if (order !== 'asc' && order !== 'desc') {
    throw new CliError('SCENE_INSIGHTS_INVALID_ARGUMENT', '--order must be asc or desc')
  }
  const limit = parseInteger(a['--limit'] ?? 100, '--limit', 1, 10_000)
  const lines = a['--lines'] !== undefined ? parseInteger(a['--lines'], '--lines', 0, 1000) : undefined
  const step = a['--step'] !== undefined ? parseInteger(a['--step'], '--step', 10, 86_400) : undefined
  const query = a['--query']
  if (query !== undefined && (query.length < 1 || query.length > 256)) {
    throw new CliError('SCENE_INSIGHTS_INVALID_ARGUMENT', '--query must be 1 to 256 characters')
  }
  const metric = positional ? normalizeMetricName(positional) : undefined

  const target = await resolveTarget(options)
  const baseUrl = a['--target'] || DEFAULT_SERVER
  components.logger.info(`Scene insights for ${target.label} (${baseUrl})`)

  const session = await openSession(components, target, baseUrl, {
    linkerPort: a['--port'],
    openBrowser: !a['--no-browser'],
    isHttps: !!a['--https']
  })
  components.logger.info(`Signed in as ${session.address}`)

  const client = createInsightsClient(components, baseUrl, session, target.metadata)
  const output: Output = {
    write: (line) => process.stdout.write(line + '\n'),
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
      return runTail(client, { lines, level, query, signal: controller.signal }, output)
    }
    case 'metrics':
      return runMetrics(client, { ...common, metric, step, execution: a['--execution'] }, output)
    case 'executions':
      return runExecutions(client, common, output)
  }
}
