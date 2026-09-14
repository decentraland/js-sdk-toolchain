import { spawn, ChildProcess, StdioOptions } from 'child_process'
import { Readable } from 'stream'
import { CliComponents } from '../../components'
import { printProgressInfo, printWarning } from '../../logic/beautiful-logs'
import { colors } from '../../components/log'
import { PreviewComponents } from './types'
import { ProjectUnion } from '../../logic/project-validations'
import { isElectronEnvironment, getSpawnEnv, findNpxBin, findNpxCliJs } from './utils'
import { getBaseCoords } from '../../logic/scene-validations'
import { future } from '../../logic/future'

const HAMMURABI_PACKAGE = '@dcl/hammurabi-server'
const HAMMURABI_VERSION = 'next'

const BEVY_PACKAGE = '@dcl-regenesislabs/bevy-headless-server'
const BEVY_VERSION = 'latest'

const EXIT_UNAVAILABLE = 78

type ServerEngine = 'bevy' | 'hammurabi'

const CMD_METACHARACTERS = /[&|<>^%"!\r\n]/

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

const TRACING_PREFIX = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+Z\s+(INFO|WARN|ERROR|DEBUG|TRACE)\s+[\w:]+:\s?/
const HEARTBEAT_LINE = /^\[headless\] alive:/
const SCENE_ROOM_JOINED_LINE = /added scene channel/
const SERVER_READY_TIMEOUT_MS = 120_000
const ANSI_CODES = /\u001b\[[0-9;]*m/g

const ENGINE_NOISE = [
  /^failed to process gltf/,
  /^Path not found: \$ipfs/,
  /^bevy_render feature is enabled but RenderApp was not detected/,
  /^Could not find an asset loader matching: .* Path: Some\("embedded:\/\//
]

const SCENE_CONTEXT = /^\[\[-?\d+, -?\d+\] \d+\.\d+\] /

function colorByLevel(level: string | undefined, message: string): string {
  if (level === 'WARN') return colors.yellow(message)
  if (level === 'ERROR') return colors.redBright(message)
  return message
}

function localTime(utcTimestamp: string): string {
  const date = new Date(utcTimestamp + 'Z')
  return isNaN(date.getTime()) ? '' : colors.dim(date.toTimeString().slice(0, 8)) + ' '
}

/**
 * Forwards a bevy child stream line by line, tagged `[Server]` to stand apart from
 * the preview CLI's own output, dropping the tracing prefix (warnings yellow,
 * errors red) and the periodic `[headless] alive:` heartbeat.
 */
function forwardEngineLogs(source: Readable | null, sink: NodeJS.WriteStream, onLine: (line: string) => void) {
  if (!source) return
  const serverTag = colors.greenBright('[Server]') + ' '
  const writeClean = (raw: string) => {
    const line = raw.replace(ANSI_CODES, '')
    if (!line.trim()) return
    onLine(line)
    if (HEARTBEAT_LINE.test(line)) return
    const match = line.match(TRACING_PREFIX)
    if (!match) {
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

export type MultiplayerServer = {
  child: ChildProcess
  /** bevy only: true once the server joined the scene room, false if it exited first. */
  ready?: Promise<boolean>
}

/**
 * Starts the Multiplayer Server process using npx to install and run in one step
 */
export function startMultiplayerServer(
  components: Pick<CliComponents, 'logger' | 'analytics'>,
  workingDir: string,
  realm: string,
  engine: ServerEngine = DEFAULT_ENGINE,
  position?: { x: number; y: number }
): MultiplayerServer {
  const pkg = packageSpec(engine)

  printProgressInfo(
    components.logger,
    `Starting ${colors.bold('Multiplayer Server')} (${engine}) with realm: ${colors.bold(realm)}`
  )

  const npxArgs = ['--yes', pkg, `--realm=${realm}`]
  if (position) npxArgs.push(`--position=${position.x},${position.y}`)
  const npxCliJs = findNpxCliJs()
  const npxPath = npxCliJs ? null : findNpxBin()
  if (!npxCliJs && !npxPath) {
    throw new Error('npx-cli.js and npx were not found in a trusted location')
  }
  const useShell = !!npxPath && process.platform === 'win32'
  if (useShell) {
    const unsafe = npxArgs.find((arg) => CMD_METACHARACTERS.test(arg))
    if (unsafe) throw new Error(`refusing to run npx through the shell with argument ${JSON.stringify(unsafe)}`)
    printWarning(
      components.logger,
      `npx-cli.js not found next to ${process.execPath} or any npm on PATH; running ${npxPath} through the shell`
    )
  }

  const env: { [key: string]: string } = isElectronEnvironment()
    ? { ...getSpawnEnv(), npm_config_prefix: workingDir }
    : { ...getSpawnEnv() }

  if (engine === 'bevy') {
    env.RUST_LOG = env.RUST_LOG ? `${env.RUST_LOG},comms=warn` : 'warn,scene_runner::renderer_context=info'
  }

  const stdio: StdioOptions = engine === 'bevy' ? ['inherit', 'pipe', 'pipe'] : 'inherit'

  const serverProcess = npxCliJs
    ? spawn(process.execPath, [npxCliJs, ...npxArgs], { cwd: workingDir, shell: false, stdio, env })
    : spawn(npxPath!, useShell ? npxArgs.map((arg) => `"${arg}"`) : npxArgs, {
        cwd: workingDir,
        shell: useShell,
        stdio,
        env
      })

  const ready = engine === 'bevy' ? future<boolean>() : undefined
  if (ready) {
    const onLine = (line: string) => {
      if (SCENE_ROOM_JOINED_LINE.test(line)) ready.resolve(true)
    }
    forwardEngineLogs(serverProcess.stdout, process.stdout, onLine)
    forwardEngineLogs(serverProcess.stderr, process.stderr, onLine)
  }

  serverProcess.on('error', (error) => {
    printWarning(components.logger, `Multiplayer Server process error: ${error.message}`)
  })

  const cleanup = () => {
    if (!serverProcess.killed) {
      serverProcess.kill('SIGTERM')
    }
  }

  const removeCleanup = registerProcessCleanup(cleanup)

  serverProcess.on('close', (code, signal) => {
    removeCleanup()
    ready?.resolve(false)
    if (code !== 0 && code !== null) {
      components.analytics.track('Multiplayer server exited', {
        engine,
        exitCode: code,
        unavailable: code === EXIT_UNAVAILABLE
      })
      printWarning(
        components.logger,
        `Multiplayer Server exited with code ${code}. The preview keeps running without it, ` +
          `but clients wait for state sync (isStateSyncronized stays false) until a server joins the scene room.`
      )
    } else if (signal && signal !== 'SIGTERM' && signal !== 'SIGINT') {
      printWarning(components.logger, `Multiplayer Server terminated by signal ${signal}`)
    }
  })

  return { child: serverProcess, ready }
}

/** Waits for the server to join the scene room, exit, or time out. */
export async function waitForServerReady(
  components: Pick<CliComponents, 'logger'>,
  ready: Promise<boolean>,
  timeoutMs: number = SERVER_READY_TIMEOUT_MS
): Promise<void> {
  printProgressInfo(components.logger, 'Waiting for the Multiplayer Server to join the scene room...')
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs)
  })
  const result = await Promise.race([ready, timeout])
  clearTimeout(timer)
  if (result === true) {
    printProgressInfo(components.logger, `${colors.bold('Multiplayer Server')} is ready`)
    return
  }
  const reason = result === 'timeout' ? `is not ready after ${timeoutMs / 1000}s` : 'is not running'
  printWarning(
    components.logger,
    `Multiplayer Server ${reason}. Opening the client anyway; state sync completes once a server joins the scene room.`
  )
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
 * @returns The readiness promise when the server output is observable, undefined otherwise
 */
export function spawnAuthServer(
  components: PreviewComponents,
  project: ProjectUnion,
  realm: string
): Promise<boolean> | undefined {
  const engine = selectedEngine()
  try {
    const server = startMultiplayerServer(
      components,
      project.workingDirectory,
      realm,
      engine,
      getBaseCoords(project.scene)
    )
    void components.signaler.programClosed
      .then(() => {
        if (!server.child.killed) server.child.kill('SIGTERM')
      })
      .catch(() => {})
    if (engine === 'bevy') {
      server.child.on('close', (code) => {
        if (code !== EXIT_UNAVAILABLE) return
        const { logger } = components
        logger.error(
          `The bevy multiplayer server (${packageSpec(engine)}) cannot run on this machine ` +
            `(exit ${EXIT_UNAVAILABLE}: unsupported platform or missing binary — ${process.platform}-${process.arch}).`
        )
        logger.error(`To run the preview with the hammurabi server instead:`)
        logger.error(`  DCL_SERVER_ENGINE=hammurabi npm start`)
        void components.analytics.stop().finally(() => process.exit(EXIT_UNAVAILABLE))
      })
    }
    return server.ready
  } catch (error: any) {
    printWarning(components.logger, `Failed to start Multiplayer Server: ${error.message}`)
    return undefined
  }
}
