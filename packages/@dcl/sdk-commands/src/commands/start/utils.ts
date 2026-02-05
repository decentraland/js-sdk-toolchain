import * as os from 'os'
import fs from 'fs'
import path from 'path'
import { CliComponents } from '../../components'
import { readJson } from '../../logic/fs'

// Use the same npm binary pattern as the rest of the codebase
const npmBin = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'

/**
 * Get the LAN IP address for external device access (e.g., mobile preview)
 */
export function getLanIp(): string | undefined {
  const networkInterfaces = os.networkInterfaces()
  return Object.values(networkInterfaces)
    .flat()
    .find((details) => details?.family === 'IPv4' && !details.internal && details.address !== '127.0.0.1')?.address
}

/**
 * Get the full LAN URL with protocol for external device access
 */
export function getLanUrl(port: number | string): string | undefined {
  const ip = getLanIp()
  if (!ip) return undefined
  return `http://${ip}:${port}`
}

/**
 * Detects if the code is running in an Electron environment
 */
export function isElectronEnvironment(): boolean {
  return typeof process.versions !== 'undefined' && 'electron' in process.versions
}

/**
 * Gets the spawn environment, adding ELECTRON_RUN_AS_NODE if running in Electron
 */
export function getSpawnEnv(): { [key: string]: string } {
  if (isElectronEnvironment()) {
    return {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1'
    }
  }
  return process.env as { [key: string]: string }
}

/**
 * Gets the npm binary name (npm or npm.cmd on Windows)
 */
export function getNpmBin(): string {
  return npmBin
}

/**
 * Gets the npm-cli.js path in Electron environment, or null if not found
 * Should only be called when isElectronEnvironment() returns true
 */
export function getElectronNpm(): string | null {
  const npmPath =
    process.env.PATH?.split(path.delimiter)
      .map((dir) => path.join(dir, npmBin))
      .find((npm) => fs.existsSync(npm)) || npmBin

  if (fs.existsSync(npmPath)) {
    const npmCliJs = path.join(path.dirname(npmPath), 'npm-cli.js')
    if (fs.existsSync(npmCliJs)) {
      return npmCliJs
    }
  }

  return null
}

/**
 * Gets the package root directory by resolving the package itself and walking up to find package.json
 * This works even when package.json is not in the exports field
 */
export function getPackageRoot(workingDir: string, packageName: string): string {
  try {
    // Resolve the package itself (not package.json) to avoid exports field restrictions
    const packagePath = require.resolve(packageName, { paths: [workingDir] })

    // Walk up the directory tree to find package.json
    let currentDir = path.dirname(packagePath)
    const root = path.parse(currentDir).root

    while (currentDir !== root) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir
      }
      currentDir = path.dirname(currentDir)
    }

    throw new Error(`Could not find package.json for ${packageName}`)
  } catch (error: any) {
    throw new Error(`Could not resolve package root for ${packageName}: ${error.message}`)
  }
}

/**
 * Reads package.json and extracts the bin entry path
 */
export async function getPackageBinPath(
  components: Pick<CliComponents, 'fs'>,
  packageDir: string,
  binName: string
): Promise<string> {
  const packageJson = await readJson<{ bin?: string | Record<string, string> }>(
    components,
    path.join(packageDir, 'package.json')
  )

  const binPath =
    typeof packageJson.bin === 'string'
      ? packageJson.bin
      : typeof packageJson.bin === 'object' && packageJson.bin?.[binName]
      ? packageJson.bin[binName]
      : null

  if (!binPath) {
    throw new Error(`No bin entry found for "${binName}" in package.json`)
  }

  return path.resolve(packageDir, binPath)
}
