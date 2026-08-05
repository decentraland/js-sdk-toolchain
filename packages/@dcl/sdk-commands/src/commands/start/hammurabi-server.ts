import { spawn, execFile, ChildProcess } from 'child_process'
import { CliComponents } from '../../components'
import { printProgressInfo, printWarning } from '../../logic/beautiful-logs'
import { colors } from '../../components/log'
import { ProjectUnion } from '../../logic/project-validations'
import { isElectronEnvironment, getSpawnEnv, findNpxCliJs, getNpxBin } from './utils'

const HAMMURABI_PACKAGE = '@dcl/hammurabi-server'
// Pinned deliberately: `@next` makes npx re-resolve against the registry on every
// spawn — minutes of stall on a slow network, and silent version drift between
// restarts of the same session. An exact version is served from the npx cache.
// To bump: `npm view @dcl/hammurabi-server@next version` and paste the result here.
const HAMMURABI_VERSION = '1.7.1-29841479494.commit-32667d1'

// Delay before each respawn; the last entry repeats.
const RESPAWN_DELAYS_MS = [0, 1000, 2000, 4000]
const MAX_CONSECUTIVE_FAILURES = 5
// A child that survived this long is considered healthy, so its eventual death
// starts the backoff over instead of counting towards a crash loop.
const HEALTHY_UPTIME_MS = 30_000

export type HammurabiServer = {
  /** Stops respawning and kills the running process tree. */
  stop: () => void
  /** Replaces the running child with a fresh one, e.g. after a scene rebuild. */
  restart: () => void
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
 * Signals the child's whole process group. `npx` is only a launcher: the server
 * itself is a grandchild, so killing the direct child leaves the server orphaned
 * and still holding the port — which is why a restart used to hit "port in use".
 */
function killProcessTree(child: ChildProcess): void {
  const pid = child.pid
  if (!pid) return

  if (process.platform === 'win32') {
    // no process groups to signal; taskkill /T walks the tree instead
    execFile('taskkill', ['/pid', String(pid), '/T', '/F'], () => undefined)
    return
  }

  try {
    process.kill(-pid, 'SIGTERM')
  } catch (_error) {
    // the group is gone already, or was never created because spawn failed
    child.kill('SIGTERM')
  }
}

/**
 * Starts the Multiplayer Server and keeps it alive: an unexpected exit is
 * respawned with backoff so the preview does not silently lose multiplayer.
 */
export function startHammurabiServer(
  components: Pick<CliComponents, 'logger'>,
  workingDir: string,
  realm: string
): HammurabiServer {
  const npxArgs = ['--yes', '--prefer-offline', `${HAMMURABI_PACKAGE}@${HAMMURABI_VERSION}`, `--realm=${realm}`]
  const npxCliJs = findNpxCliJs()

  // In Electron, override npm_config_prefix because npm derives its prefix from process.execPath,
  // which points to the Electron Helper binary. This causes npm to look for a `lib/` directory
  // inside the Helper bundle, which doesn't exist (ENOENT).
  const env = isElectronEnvironment() ? { ...getSpawnEnv(), npm_config_prefix: workingDir } : getSpawnEnv()

  let child: ChildProcess | undefined
  let running = false
  let stopping = false
  let restarting = false
  let failures = 0
  let respawnTimer: NodeJS.Timeout | undefined

  const spawnChild = () => {
    printProgressInfo(
      components.logger,
      `Starting ${colors.bold('Multiplayer Server')} with realm: ${colors.bold(realm)}`
    )

    const startedAt = Date.now()
    const options = {
      cwd: workingDir,
      shell: false,
      stdio: 'inherit' as const,
      env,
      // own process group, so killProcessTree can take the server down with the launcher
      detached: process.platform !== 'win32'
    }

    // If npx-cli.js was found, run it directly via process.execPath (node in regular env,
    // Electron Helper with ELECTRON_RUN_AS_NODE=1 in Electron). Otherwise fall back to npx binary.
    child = npxCliJs ? spawn(process.execPath, [npxCliJs, ...npxArgs], options) : spawn(getNpxBin(), npxArgs, options)
    running = true

    child.on('error', (error) => {
      printWarning(components.logger, `Multiplayer Server process error: ${error.message}`)
    })

    child.on('close', (code) => {
      running = false
      if (stopping) return

      if (restarting) {
        restarting = false
        spawnChild()
        return
      }

      if (Date.now() - startedAt >= HEALTHY_UPTIME_MS) failures = 0
      failures++

      if (failures > MAX_CONSECUTIVE_FAILURES) {
        printWarning(
          components.logger,
          `Multiplayer Server exited with code ${code} and could not stay up after ${MAX_CONSECUTIVE_FAILURES} attempts. ` +
            `Multiplayer is OFF for the rest of this session — restart the preview to try again.`
        )
        return
      }

      const delay = RESPAWN_DELAYS_MS[Math.min(failures - 1, RESPAWN_DELAYS_MS.length - 1)]
      printWarning(
        components.logger,
        `Multiplayer Server exited with code ${code}. Restarting in ${delay}ms (attempt ${failures}/${MAX_CONSECUTIVE_FAILURES})`
      )
      respawnTimer = setTimeout(spawnChild, delay)
    })
  }

  const stop = () => {
    if (stopping) return
    stopping = true
    clearTimeout(respawnTimer)
    removeCleanup()
    if (child && running) killProcessTree(child)
  }

  const restart = () => {
    if (stopping || restarting) return
    clearTimeout(respawnTimer)
    failures = 0

    if (!child || !running) {
      spawnChild()
      return
    }

    printProgressInfo(components.logger, `Restarting ${colors.bold('Multiplayer Server')} with the new scene build`)
    restarting = true
    killProcessTree(child)
  }

  const removeCleanup = registerProcessCleanup(stop)

  spawnChild()

  return { stop, restart }
}

/**
 * Spawns the multiplayer server for the project.
 * In the auth-server SDK, all scenes are authoritative multiplayer.
 * Uses npx to handle installation and execution in a single step (works in Electron).
 *
 * @param components - Preview components including logger
 * @param project - The project to start the multiplayer server for
 * @param realm - The realm URL to pass to the hammurabi server
 * @returns The supervisor if started, undefined otherwise
 */
export function spawnAuthServer(
  components: Pick<CliComponents, 'logger'>,
  project: ProjectUnion,
  realm: string
): HammurabiServer | undefined {
  try {
    return startHammurabiServer(components, project.workingDirectory, realm)
  } catch (error: any) {
    printWarning(components.logger, `Failed to start Multiplayer Server: ${error.message}`)
    return undefined
  }
}
