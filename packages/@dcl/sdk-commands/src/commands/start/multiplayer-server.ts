import { spawn, ChildProcess } from 'child_process'
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
// missing binary, bad arguments), which is our cue to fall back to hammurabi.
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

/**
 * Starts the Multiplayer Server process using npx to install and run in one step
 */
export function startMultiplayerServer(
  components: Pick<CliComponents, 'logger'>,
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
  const env = isElectronEnvironment() ? { ...getSpawnEnv(), npm_config_prefix: workingDir } : getSpawnEnv()

  // If npx-cli.js was found, run it directly via process.execPath (node in regular env,
  // Electron Helper with ELECTRON_RUN_AS_NODE=1 in Electron). Otherwise fall back to npx binary.
  const serverProcess = npxCliJs
    ? spawn(process.execPath, [npxCliJs, ...npxArgs], { cwd: workingDir, shell: false, stdio: 'inherit', env })
    : spawn(getNpxBin(), npxArgs, { cwd: workingDir, shell: false, stdio: 'inherit', env })

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

  serverProcess.on('close', (code) => {
    removeCleanup()
    if (code !== 0 && code !== null) {
      printWarning(components.logger, `Multiplayer Server exited with code ${code}`)
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
 * to bevy. When bevy reports itself unavailable on this machine, hammurabi is started instead.
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
    // No fallback when DCL_SERVER_PACKAGE is set: packageSpec would resolve the
    // hammurabi retry to the same overridden package that just exited 78.
    if (engine === 'bevy' && !process.env.DCL_SERVER_PACKAGE) {
      child.on('close', (code) => {
        if (code === EXIT_UNAVAILABLE) {
          printWarning(components.logger, 'Bevy multiplayer server unavailable here — falling back to hammurabi')
          startMultiplayerServer(components, project.workingDirectory, realm, 'hammurabi')
        }
      })
    }
    return child
  } catch (error: any) {
    printWarning(components.logger, `Failed to start Multiplayer Server: ${error.message}`)
    return undefined
  }
}
