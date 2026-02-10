import * as os from 'os'
import fs from 'fs'
import path from 'path'

// Platform-aware binary names
const npmBin = /^win/.test(process.platform) ? 'npm.cmd' : 'npm'
const npxBin = /^win/.test(process.platform) ? 'npx.cmd' : 'npx'

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
 * Gets the npx binary name (npx or npx.cmd on Windows)
 */
export function getNpxBin(): string {
  return npxBin
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
 * Attempts to find npx-cli.js on disk. Works in both regular Node.js and Electron.
 *
 * Tries three strategies:
 * 1. Derive from process.execPath (standard Node.js installs, nvm, etc.)
 * 2. Look alongside the npm binary found on PATH
 * 3. Look inside Electron's app.asar.unpacked bundled npm (e.g. Creator Hub)
 *
 * Returns the absolute path to npx-cli.js, or null if not found.
 */
export function findNpxCliJs(): string | null {
  const execDir = path.dirname(process.execPath)

  // Strategy 1: Derive from process.execPath
  // Unix:    {prefix}/bin/node  -> {prefix}/lib/node_modules/npm/bin/npx-cli.js
  // Windows: {prefix}/node.exe  -> {prefix}/node_modules/npm/bin/npx-cli.js
  const execPathCandidates = [
    path.join(execDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    path.join(execDir, 'node_modules', 'npm', 'bin', 'npx-cli.js')
  ]

  for (const candidate of execPathCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  // Strategy 2: Find npx-cli.js next to npm on PATH
  const npmPath =
    process.env.PATH?.split(path.delimiter)
      .map((dir) => path.join(dir, npmBin))
      .find((npm) => fs.existsSync(npm)) || npmBin

  if (fs.existsSync(npmPath)) {
    const npxCliJs = path.join(path.dirname(npmPath), 'npx-cli.js')
    if (fs.existsSync(npxCliJs)) {
      return npxCliJs
    }
  }

  // Strategy 3: Look in Electron's app.asar.unpacked bundled npm
  const resourcesPath = (process as any).resourcesPath as string | undefined
  if (resourcesPath) {
    const npxCliJs = path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'npm', 'bin', 'npx-cli.js')
    if (fs.existsSync(npxCliJs)) {
      return npxCliJs
    }
  }

  return null
}
