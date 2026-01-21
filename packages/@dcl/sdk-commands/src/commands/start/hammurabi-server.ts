import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import { CliComponents } from '../../components'
import { printProgressInfo, printWarning } from '../../logic/beautiful-logs'
import { colors } from '../../components/log'

const HAMMURABI_PACKAGE = '@dcl/hammurabi-server'
const HAMMURABI_VERSION = 'next'

/**
 * Checks if @dcl/hammurabi-server (Authoritative Server) is installed in the project's devDependencies
 */
export async function checkHammurabiServerInstalled(
  components: Pick<CliComponents, 'fs'>,
  workingDir: string
): Promise<boolean> {
  try {
    const packageJsonPath = path.join(workingDir, 'package.json')
    const packageJsonExists = await components.fs.fileExists(packageJsonPath)
    
    if (!packageJsonExists) {
      return false
    }

    const packageJsonRaw = await components.fs.readFile(packageJsonPath, 'utf8')
    const packageJson = JSON.parse(packageJsonRaw)
    
    return !!(
      packageJson.devDependencies?.[HAMMURABI_PACKAGE] ||
      packageJson.dependencies?.[HAMMURABI_PACKAGE]
    )
  } catch (error) {
    return false
  }
}

/**
 * Installs @dcl/hammurabi-server (Authoritative Server) package as a devDependency
 */
export async function installHammurabiServer(
  components: Pick<CliComponents, 'spawner' | 'logger'>,
  workingDir: string
): Promise<void> {
  try {
    printProgressInfo(
      components.logger,
      `Installing ${colors.bold('Authoritative Server')} (${HAMMURABI_PACKAGE}@${HAMMURABI_VERSION})...`
    )
    
    await components.spawner.exec(
      workingDir,
      'npm',
      ['install', '--save-dev', `${HAMMURABI_PACKAGE}@${HAMMURABI_VERSION}`],
      { silent: false }
    )
    
    printProgressInfo(
      components.logger,
      `${colors.bold('Authoritative Server')} installed successfully`
    )
  } catch (error: any) {
    throw new Error(`Failed to install Authoritative Server: ${error.message}`)
  }
}

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

  const hammurabiProcess = spawn(
    'npx',
    [HAMMURABI_PACKAGE, `--realm=${realm}`],
    {
      cwd: workingDir,
      shell: true,
      stdio: 'pipe'
    }
  )

  // Prefix and pipe stdout
  hammurabiProcess.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n').filter(line => line.trim())
    lines.forEach(line => {
      components.logger.log(`${colors.bold('[Authoritative Server]')} ${line}`)
    })
  })

  // Prefix and pipe stderr
  hammurabiProcess.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n').filter(line => line.trim())
    lines.forEach(line => {
      components.logger.error(`${colors.bold('[Authoritative Server]')} ${line}`)
    })
  })

  hammurabiProcess.on('error', (error) => {
    printWarning(
      components.logger,
      `Authoritative Server process error: ${error.message}`
    )
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
      printWarning(
        components.logger,
        `Authoritative Server exited with code ${code}`
      )
    }
  })

  return hammurabiProcess
}
