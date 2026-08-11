import { spawn, ChildProcess, StdioOptions } from 'child_process'
import { Readable } from 'stream'
import { CliComponents } from '../../components'
import { printProgressInfo, printWarning } from '../../logic/beautiful-logs'
import { colors } from '../../components/log'
import { PreviewComponents } from './types'
import { ProjectUnion } from '../../logic/project-validations'
import { isElectronEnvironment, getSpawnEnv, findNpxCliJs, getNpxBin } from './utils'

const HAMMURABI_PACKAGE = '@dcl/hammurabi-server'
const HAMMURABI_VERSION = 'next'

const BEVY_PACKAGE = '@dcl-regenesislabs/bevy-headless-server'
const BEVY_VERSION = 'next'

// The bevy server exits with this when it can never run here (unsupported platform,
// missing binary, bad arguments). We fail the preview loudly instead of retrying:
// a silent fallback would hide broken bevy installs from the people shipping them.
const EXIT_UNAVAILABLE = 78

type ServerEngine = 'bevy' | 'hammurabi'

const DEFAULT_ENGINE: ServerEngine = 'bevy'

function selectedEngine(): ServerEngine {
  const requested = process.env.DCL_SERVER_ENGINE
  return requested === 'bevy' || requested === 'hammurabi' ? requested : DEFAULT_ENGINE
}

/**
 * npx accepts a directory or tarball as well as a registry spec, so pointing
 * DCL_SERVER_PACKAGE at a local build exercises this spawn path without publishing.
 */
function packageSpec(engine: ServerEngine): string {
  const override = process.env.DCL_SERVER_PACKAGE
  if (override) return override
  return engine === 'bevy' ? `${BEVY_PACKAGE}@${BEVY_VERSION}` : `${HAMMURABI_PACKAGE}@${HAMMURABI_VERSION}`
}

/**
 * Registers cleanup handlers on the global process object
 * Returns a function to remove the handlers
 */
function registerProcessCleanup(cleanup: () => void): () => void {
  process.on('SIGTERM', cleanup)
  process.on('SIGINT', cleanup)
  process.on('exit', cleanup)

  return () => {
    process.off('SIGTERM', cleanup)
    process.off('SIGINT', cleanup)
    process.off('exit', cleanup)
  }
}

// `2026-08-11T14:28:33.522058Z  INFO scene_runner::renderer_context: ` — the
// timestamp/level/target prefix the bevy engine's tracing puts on every line
const TRACING_PREFIX = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+Z\s+(INFO|WARN|ERROR|DEBUG|TRACE)\s+[\w:]+:\s?/
const HEARTBEAT_LINE = /^\[headless\] alive:/
// The engine colors its output even when piped, so lines arrive wrapped in ANSI
// escapes and must be stripped before the prefix regex can match.
// eslint-disable-next-line no-control-regex
const ANSI_CODES = /\u001b\[[0-9;]*m/g

// Engine-internal noise in local preview: the asset pipeline hunts dot-prefixed
// processed gltf paths the preview server never has (repeated on every scene
// composition), and the headless build's expected gizmo/asset-loader startup
// complaints about the renderer it deliberately doesn't have
const ENGINE_NOISE = [
  /^failed to process gltf/,
  /^Path not found: \$ipfs/,
  /^bevy_render feature is enabled but RenderApp was not detected/,
  /^Could not find an asset loader matching: .* Path: Some\("embedded:\/\//
]

// `[[0, 0] 3.33] ` — parcel coords + scene clock the engine prepends to every
// scene log line; redundant in a single-scene preview
const SCENE_CONTEXT = /^\[\[-?\d+, -?\d+\] \d+\.\d+\] /

// color alone conveys the level; the LOG/WARN/ERROR words are dropped
function colorByLevel(level: string | undefined, message: string): string {
  if (level === 'WARN') return colors.yellow(message)
  if (level === 'ERROR') return colors.redBright(message)
  return message
}

// engine timestamps are UTC ISO with microseconds; show local wall-clock instead
function localTime(utcTimestamp: string): string {
  const date = new Date(utcTimestamp + 'Z')
  return isNaN(date.getTime()) ? '' : colors.gray(date.toTimeString().slice(0, 8)) + ' '
}

/**
 * Forwards a bevy child stream line by line, tagged `[Server]` to stand apart from
 * the preview CLI's own output, dropping the tracing prefix (warnings yellow,
 * errors red) and the periodic `[headless] alive:` heartbeat.
 */
function forwardEngineLogs(source: Readable | null, sink: NodeJS.WriteStream) {
  if (!source) return
  const serverTag = colors.green('[Server]') + ' '
  const writeClean = (raw: string) => {
    const line = raw.replace(ANSI_CODES, '')
    if (!line.trim()) return
    if (HEARTBEAT_LINE.test(line)) return
    const match = line.match(TRACING_PREFIX)
    if (!match) {
      // launcher lines ([headless] realm=...): the [Server] tag replaces their own
      sink.write(serverTag + line.replace(/^\[headless\] /, '') + '\n')
      return
    }
    const message = line.slice(match[0].length)
    if (ENGINE_NOISE.some((pattern) => pattern.test(message))) return
    if (SCENE_CONTEXT.test(message)) {
      const sceneMessage = message.replace(SCENE_CONTEXT, '')
      const sceneTag = sceneMessage.match(/^(LOG|WARN|ERROR|DEBUG) /)
      const body = sceneTag ? sceneMessage.slice(sceneTag[0].length) : sceneMessage
      sink.write(serverTag + localTime(match[1]) + colorByLevel(sceneTag?.[1], body) + '\n')
    } else {
      sink.write(serverTag + localTime(match[1]) + colorByLevel(match[2], message) + '\n')
    }
  }
  let pending = ''
  source.setEncoding('utf8')
  source.on('data', (chunk: string) => {
    const lines = (pending + chunk).split('\n')
    pending = lines.pop() ?? ''
    lines.forEach(writeClean)
  })
  source.on('end', () => {
    if (pending) writeClean(pending)
  })
}

/**
 * Starts the Multiplayer Server process using npx to install and run in one step
 */
export function startMultiplayerServer(
  components: Pick<CliComponents, 'logger' | 'analytics'>,
  workingDir: string,
  realm: string,
  engine: ServerEngine = DEFAULT_ENGINE
): ChildProcess {
  const pkg = packageSpec(engine)

  printProgressInfo(
    components.logger,
    `Starting ${colors.bold('Multiplayer Server')} (${engine}) with realm: ${colors.bold(realm)}`
  )

  const npxArgs = ['--yes', pkg, `--realm=${realm}`]
  const npxCliJs = findNpxCliJs()

  // In Electron, override npm_config_prefix because npm derives its prefix from process.execPath,
  // which points to the Electron Helper binary. This causes npm to look for a `lib/` directory
  // inside the Helper bundle, which doesn't exist (ENOENT).
  const env: { [key: string]: string } = isElectronEnvironment()
    ? { ...getSpawnEnv(), npm_config_prefix: workingDir }
    : { ...getSpawnEnv() }

  // Quiet the bevy engine's internal tracing chatter while keeping scene logs
  // (scene_runner::renderer_context) and real warnings. An explicit RUST_LOG wins.
  if (engine === 'bevy' && !env.RUST_LOG) {
    env.RUST_LOG = 'warn,scene_runner::renderer_context=info'
  }

  // Bevy output goes through the line filter below; hammurabi keeps the terminal directly.
  const stdio: StdioOptions = engine === 'bevy' ? ['inherit', 'pipe', 'pipe'] : 'inherit'

  // If npx-cli.js was found, run it directly via process.execPath (node in regular env,
  // Electron Helper with ELECTRON_RUN_AS_NODE=1 in Electron). Otherwise fall back to npx binary.
  const serverProcess = npxCliJs
    ? spawn(process.execPath, [npxCliJs, ...npxArgs], { cwd: workingDir, shell: false, stdio, env })
    : spawn(getNpxBin(), npxArgs, { cwd: workingDir, shell: false, stdio, env })

  if (engine === 'bevy') {
    forwardEngineLogs(serverProcess.stdout, process.stdout)
    forwardEngineLogs(serverProcess.stderr, process.stderr)
  }

  serverProcess.on('error', (error) => {
    printWarning(components.logger, `Multiplayer Server process error: ${error.message}`)
  })

  // Register cleanup handlers
  const cleanup = () => {
    if (!serverProcess.killed) {
      serverProcess.kill('SIGTERM')
    }
  }

  const removeCleanup = registerProcessCleanup(cleanup)

  serverProcess.on('close', (code, signal) => {
    removeCleanup()
    if (code !== 0 && code !== null) {
      // report abnormal exits (including bevy's exit-78 "can't run here") so we can
      // tell from telemetry when the server is failing on users' machines
      components.analytics.track('Multiplayer server exited', {
        engine,
        exitCode: code,
        unavailable: code === EXIT_UNAVAILABLE
      })
      printWarning(components.logger, `Multiplayer Server exited with code ${code}`)
    } else if (signal && signal !== 'SIGTERM' && signal !== 'SIGINT') {
      // SIGTERM/SIGINT are our own shutdown; anything else (SIGSEGV, SIGKILL/OOM)
      // means the engine died out from under the preview
      printWarning(components.logger, `Multiplayer Server terminated by signal ${signal}`)
    }
  })

  return serverProcess
}

/**
 * Spawns the multiplayer server for the project.
 * In the auth-server SDK, all scenes are authoritative multiplayer.
 * Uses npx to handle installation and execution in a single step (works in Electron).
 *
 * Which implementation runs is chosen by DCL_SERVER_ENGINE (bevy | hammurabi), defaulting
 * to bevy. When bevy reports itself unavailable on this machine (exit 78) the preview is
 * aborted with instructions to opt into hammurabi — there is no automatic fallback.
 *
 * @param components - Preview components including logger
 * @param project - The project to start the multiplayer server for
 * @param realm - The realm URL to pass to the server
 * @returns The ChildProcess if started, undefined otherwise
 */
export function spawnAuthServer(
  components: PreviewComponents,
  project: ProjectUnion,
  realm: string
): ChildProcess | undefined {
  const engine = selectedEngine()
  try {
    const child = startMultiplayerServer(components, project.workingDirectory, realm, engine)
    if (engine === 'bevy') {
      child.on('close', (code) => {
        if (code !== EXIT_UNAVAILABLE) return
        const { logger } = components
        logger.error(
          `The bevy multiplayer server (${packageSpec(engine)}) cannot run on this machine ` +
            `(exit ${EXIT_UNAVAILABLE}: unsupported platform or missing binary — ${process.platform}-${process.arch}).`
        )
        logger.error(`To run the preview with the hammurabi server instead:`)
        logger.error(`  DCL_SERVER_ENGINE=hammurabi npm start`)
        // flush the 'Multiplayer server exited' event before killing the preview
        void components.analytics.stop().finally(() => process.exit(EXIT_UNAVAILABLE))
      })
    }
    return child
  } catch (error: any) {
    printWarning(components.logger, `Failed to start Multiplayer Server: ${error.message}`)
    return undefined
  }
}
