import * as os from 'os'
import fs from 'fs'
import path from 'path'

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

type NpxLookup = {
  execPath?: string
  pathEnv?: string
  npmBin?: string
  npxBin?: string
  resourcesPath?: string
}

function npxCliUnderNodeDir(nodeDir: string): string[] {
  return [
    path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npx-cli.js'),
    path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npx-cli.js')
  ]
}

function npxCliBesideNpm(npmPath: string): string | null {
  try {
    return path.join(path.dirname(fs.realpathSync(npmPath)), 'npx-cli.js')
  } catch {
    return null
  }
}

/**
 * Absolute path to npm's `npx-cli.js`: the npm an Electron host ships first, then the running
 * node's own npm, then every npm on PATH (Windows layout, unix `lib` layout, or an `npm` symlink
 * into the npm package). Null when no npm install is reachable.
 */
export function findNpxCliJs({
  execPath = process.execPath,
  pathEnv = process.env.PATH ?? '',
  npmBin: npm = npmBin,
  resourcesPath = (process as any).resourcesPath as string | undefined
}: NpxLookup = {}): string | null {
  const npmPaths = pathEnv
    .split(path.delimiter)
    .filter(Boolean)
    .map((dir) => path.join(dir, npm))
    .filter((candidate) => fs.existsSync(candidate))

  const bundledByElectron = resourcesPath
    ? [path.join(resourcesPath, 'app.asar.unpacked', 'node_modules', 'npm', 'bin', 'npx-cli.js')]
    : []
  const candidates = [
    ...bundledByElectron,
    ...npxCliUnderNodeDir(path.dirname(execPath)),
    ...npmPaths.flatMap((npmPath) => npxCliUnderNodeDir(path.dirname(npmPath))),
    ...npmPaths.map(npxCliBesideNpm).filter((candidate): candidate is string => !!candidate)
  ]
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}

export function findNpxBin({ pathEnv = process.env.PATH ?? '', npxBin: npx = npxBin }: NpxLookup = {}): string | null {
  const candidates = pathEnv
    .split(path.delimiter)
    .filter(path.isAbsolute)
    .map((dir) => path.join(dir, npx))

  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null
}
