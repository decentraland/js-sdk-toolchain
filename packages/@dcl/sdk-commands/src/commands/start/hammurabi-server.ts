import { spawn, ChildProcess } from 'child_process'
import { CliComponents } from '../../components'
import { printProgressInfo, printWarning } from '../../logic/beautiful-logs'
import { colors } from '../../components/log'
import { PreviewComponents } from './types'
import { ProjectUnion } from '../../logic/project-validations'
import { isElectronEnvironment, getSpawnEnv, findNpxCliJs, getNpxBin } from './utils'

const HAMMURABI_PACKAGE = '@dcl/hammurabi-server'
const HAMMURABI_VERSION = 'next'

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
export function startHammurabiServer(
  components: Pick<CliComponents, 'logger'>,
  workingDir: string,
  realm: string
): ChildProcess {
  printProgressInfo(
    components.logger,
    `Starting ${colors.bold('Multiplayer Server')} with realm: ${colors.bold(realm)}`
  )

  const npxArgs = ['--yes', `${HAMMURABI_PACKAGE}@${HAMMURABI_VERSION}`, `--realm=${realm}`]
  const npxCliJs = findNpxCliJs()

  // In Electron, override npm_config_prefix because npm derives its prefix from process.execPath,
  // which points to the Electron Helper binary. This causes npm to look for a `lib/` directory
  // inside the Helper bundle, which doesn't exist (ENOENT).
  const env = isElectronEnvironment() ? { ...getSpawnEnv(), npm_config_prefix: workingDir } : getSpawnEnv()

  // If npx-cli.js was found, run it directly via process.execPath (node in regular env,
  // Electron Helper with ELECTRON_RUN_AS_NODE=1 in Electron). Otherwise fall back to npx binary.
  const hammurabiProcess = npxCliJs
    ? spawn(process.execPath, [npxCliJs, ...npxArgs], { cwd: workingDir, shell: false, stdio: 'inherit', env })
    : spawn(getNpxBin(), npxArgs, { cwd: workingDir, shell: false, stdio: 'inherit', env })

  hammurabiProcess.on('error', (error) => {
    printWarning(components.logger, `Multiplayer Server process error: ${error.message}`)
  })

  // Register cleanup handlers
  const cleanup = () => {
    if (!hammurabiProcess.killed) {
      hammurabiProcess.kill('SIGTERM')
    }
  }

  const removeCleanup = registerProcessCleanup(cleanup)

  hammurabiProcess.on('close', (code) => {
    removeCleanup()
    if (code !== 0 && code !== null) {
      printWarning(components.logger, `Multiplayer Server exited with code ${code}`)
    }
  })

  return hammurabiProcess
}

/**
 * Spawns the multiplayer server for the project.
 * In the auth-server SDK, all scenes are authoritative multiplayer.
 * Uses npx to handle installation and execution in a single step (works in Electron).
 *
 * @param components - Preview components including logger
 * @param project - The project to start the multiplayer server for
 * @param realm - The realm URL to pass to the hammurabi server
 * @returns The ChildProcess if started, undefined otherwise
 */
export function spawnAuthServer(
  components: PreviewComponents,
  project: ProjectUnion,
  realm: string
): ChildProcess | undefined {
  try {
    return startHammurabiServer(components, project.workingDirectory, realm)
  } catch (error: any) {
    printWarning(components.logger, `Failed to start Multiplayer Server: ${error.message}`)
    return undefined
  }
}
