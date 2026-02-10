import { spawn, ChildProcess } from 'child_process'
import { CliComponents } from '../../components'
import { printProgressInfo, printWarning } from '../../logic/beautiful-logs'
import { colors } from '../../components/log'
import { PreviewComponents } from './types'
import { ProjectUnion } from '../../logic/project-validations'
import { SceneWithMultiplayer } from '../../logic/scene-validations'
import {
  isElectronEnvironment,
  getSpawnEnv,
  getElectronNpm,
  getNpmBin,
  getPackageRoot,
  getPackageBinPath
} from './utils'

const HAMMURABI_PACKAGE = '@dcl/hammurabi-server'
const HAMMURABI_VERSION = 'next'

/**
 * Installs a package using npm, handling Electron environment correctly
 */
async function installPackage(
  components: Pick<CliComponents, 'spawner'>,
  workingDir: string,
  packageName: string,
  version: string
): Promise<void> {
  // In Electron, run npm via process.execPath with ELECTRON_RUN_AS_NODE
  // This ensures npm runs as Node.js and properly waits for all child processes
  if (isElectronEnvironment()) {
    const electronNpm = getElectronNpm()
    if (electronNpm) {
      // Use npm-cli.js directly via process.execPath with shell: false
      await components.spawner.exec(
        workingDir,
        process.execPath,
        [electronNpm, 'install', '--save-dev', `${packageName}@${version}`],
        {
          silent: true,
          shell: false,
          env: getSpawnEnv()
        }
      )
      return
    }
  }

  // Regular Node.js environment or fallback
  await components.spawner.exec(workingDir, getNpmBin(), ['install', '--no-save', `${packageName}@${version}`], {
    silent: true
  })
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
 * Ensures @dcl/hammurabi-server is installed in the project's node_modules
 * and returns the path to its CLI bin entry point
 */
async function ensureHammurabiInstalled(
  components: Pick<CliComponents, 'fs' | 'logger' | 'spawner'>,
  workingDir: string
): Promise<string> {
  // Try to resolve the package root directory
  let packageDir: string
  try {
    packageDir = getPackageRoot(workingDir, HAMMURABI_PACKAGE)
  } catch {
    // Package not installed, install it now
    printProgressInfo(components.logger, 'Multiplayer Server package not found, installing it...')

    try {
      await installPackage(components, workingDir, HAMMURABI_PACKAGE, HAMMURABI_VERSION)
    } catch (error: any) {
      throw new Error(
        `Failed to install ${HAMMURABI_PACKAGE}: ${error.message}. Please ensure npm is available and the project directory is writable.`
      )
    }

    // Try to resolve again after installation
    try {
      packageDir = getPackageRoot(workingDir, HAMMURABI_PACKAGE)
      printProgressInfo(components.logger, 'Multiplayer Server installed successfully')
    } catch (error: any) {
      throw new Error(`Failed to resolve ${HAMMURABI_PACKAGE} after installation: ${error.message}`)
    }
  }

  // Get the bin path from package.json
  return getPackageBinPath(components, packageDir, 'hammurabi-server')
}

/**
 * Starts the Multiplayer Server process using direct node execution
 */
export function startHammurabiServer(
  components: Pick<CliComponents, 'logger'>,
  workingDir: string,
  realm: string,
  hammurabiPath: string
): ChildProcess {
  printProgressInfo(
    components.logger,
    `Starting ${colors.bold('Multiplayer Server')} with realm: ${colors.bold(realm)}`
  )

  // Use process.execPath to run the hammurabi server
  // In Electron: process.execPath points to Electron Helper executable, need ELECTRON_RUN_AS_NODE=1
  // In regular Node.js: process.execPath points to node executable, no special env needed
  const hammurabiProcess = spawn(process.execPath, [hammurabiPath, `--realm=${realm}`], {
    cwd: workingDir,
    shell: false,
    stdio: 'inherit',
    env: getSpawnEnv()
  })

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
 * Spawns the multiplayer server if the project requires it.
 * Handles installation and execution using npm and node directly (works in Electron).
 *
 * @param components - Preview components including logger, fs, and spawner
 * @param project - The project to check for authoritative multiplayer support
 * @param realm - The realm URL to pass to the hammurabi server
 * @returns The ChildProcess if started, undefined otherwise
 */
export async function spawnMultiplayerIfNeeded(
  components: PreviewComponents,
  project: ProjectUnion,
  realm: string
): Promise<ChildProcess | undefined> {
  // Check if this is an authoritative multiplayer scene
  const sceneWithMultiplayer = project.scene as SceneWithMultiplayer
  if (!sceneWithMultiplayer.authoritativeMultiplayer) {
    return undefined
  }

  // Ensure hammurabi server is installed and get its path
  try {
    const hammurabiPath = await ensureHammurabiInstalled(components, project.workingDirectory)
    return startHammurabiServer(components, project.workingDirectory, realm, hammurabiPath)
  } catch (error: any) {
    printWarning(components.logger, `Failed to start Multiplayer Server: ${error.message}`)
    return undefined
  }
}
