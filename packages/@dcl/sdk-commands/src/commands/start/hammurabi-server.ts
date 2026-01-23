import { spawn, ChildProcess } from 'child_process'
import { CliComponents } from '../../components'
import { printProgressInfo, printWarning } from '../../logic/beautiful-logs'
import { colors } from '../../components/log'
import { PreviewComponents } from './types'
import { ProjectUnion } from '../../logic/project-validations'
import { SceneWithMultiplayer } from '../../logic/scene-validations'

const HAMMURABI_PACKAGE = '@dcl/hammurabi-server@next'

/**
 * Starts the Authoritative Server process
 */
export function startHammurabiServer(
  components: Pick<CliComponents, 'logger'>,
  workingDir: string,
  realm: string
): ChildProcess {
  printProgressInfo(
    components.logger,
    `Starting ${colors.bold('Authoritative Server')} with realm: ${colors.bold(realm)}`
  )

  const hammurabiProcess = spawn('npx', [HAMMURABI_PACKAGE, `--realm=${realm}`], {
    cwd: workingDir,
    shell: true,
    stdio: 'pipe'
  })

  // Prefix and pipe stdout with cyan color to differentiate from scene logs
  hammurabiProcess.stdout?.on('data', (data: Buffer) => {
    const lines = data
      .toString()
      .split('\n')
      .filter((line) => line.trim())
    lines.forEach((line) => {
      components.logger.log(`${colors.cyan(colors.bold('[Authoritative Server]'))} ${colors.cyan(line)}`)
    })
  })

  // Prefix and pipe stderr with cyan color to differentiate from scene logs
  // Filter out npm installation warnings and show a cleaner message
  let hasShownInstallMessage = false
  hammurabiProcess.stderr?.on('data', (data: Buffer) => {
    const lines = data
      .toString()
      .split('\n')
      .filter((line) => line.trim())
    lines.forEach((line) => {
      // Check if this is the npm warning about package installation
      if (line.includes('npm warn exec') && line.includes('was not found and will be installed')) {
        if (!hasShownInstallMessage) {
          printProgressInfo(components.logger, 'Multiplayer Server package not found, installing it...')
          hasShownInstallMessage = true
        }
        // Suppress the raw npm warning
        return
      }
      // Log other stderr messages normally
      components.logger.error(`${colors.cyan(colors.bold('[Authoritative Server]'))} ${colors.cyan(line)}`)
    })
  })

  hammurabiProcess.on('error', (error) => {
    printWarning(components.logger, `Authoritative Server process error: ${error.message}`)
  })

  // Register cleanup handlers immediately after spawning
  const cleanup = () => {
    if (!hammurabiProcess.killed) {
      hammurabiProcess.kill('SIGTERM')
    }
  }

  process.on('SIGTERM', cleanup)
  process.on('SIGINT', cleanup)
  process.on('exit', cleanup)

  hammurabiProcess.on('close', (code) => {
    // Remove listeners after process exits to prevent memory leaks
    process.off('SIGTERM', cleanup)
    process.off('SIGINT', cleanup)
    process.off('exit', cleanup)

    if (code !== 0 && code !== null) {
      printWarning(components.logger, `Authoritative Server exited with code ${code}`)
    }
  })

  return hammurabiProcess
}

/**
 * Spawns the multiplayer server if the project requires it.
 * Uses npx to automatically handle installation and run the latest version.
 *
 * @param components - Preview components including logger
 * @param project - The project to check for authoritative multiplayer support
 * @param realm - The realm URL to pass to the hammurabi server
 * @returns The ChildProcess if started, undefined otherwise
 */
export function spawnMultiplayerIfNeeded(
  components: PreviewComponents,
  project: ProjectUnion,
  realm: string
): ChildProcess | undefined {
  // Check if this is an authoritative multiplayer scene
  const sceneWithMultiplayer = project.scene as SceneWithMultiplayer
  if (!sceneWithMultiplayer.authoritativeMultiplayer) {
    return undefined
  }

  // Start the server (npx will handle installation automatically)
  try {
    return startHammurabiServer(components, project.workingDirectory, realm)
  } catch (error: any) {
    printWarning(components.logger, `Failed to start Authoritative Server: ${error.message}`)
    return undefined
  }
}
