import { homedir } from 'os'
import path from 'path'
import { randomBytes } from 'crypto'
import { execFile } from 'child_process'
import { AuthChain, AuthIdentity, Authenticator, isOperationGranted } from '@dcl/crypto'

import { CliComponents } from '../../components'
import { CliError } from '../../logic/error'
import { InsightsSession, createSessionFromChain, INSIGHTS_SERVICE, INSIGHTS_OPERATIONS } from './session'

/** Environment variable naming the folder whose .dcl/ holds the session, e.g. a sandbox an agent can read. */
export const SESSION_DIR_ENV = 'DCL_SCENE_INSIGHTS_SESSION_DIR'

/**
 * Sessions are only saved in a .dcl folder: a dot folder is never deployed (whatever .dclignore
 * says), and its own `*` .gitignore keeps git from adding anything in it.
 */
const SESSION_FOLDER = '.dcl'

/** A saved session is not used in its last minute, so a request never races its expiry. */
const EXPIRY_MARGIN_MS = 60 * 1000

/**
 * What is saved after a browser signature: the ephemeral key the wallet delegated to, and the
 * delegation. Until it expires it signs requests as the wallet, so it is written readable only by
 * the user and removed by `scene-insights logout`.
 */
export interface SavedSession {
  version: 1
  address: string
  expiration: string
  ephemeralIdentity: AuthIdentity['ephemeralIdentity']
  authChain: AuthChain
}

export function getSessionFilePath(base: string = process.env[SESSION_DIR_ENV] || homedir()): string {
  return path.resolve(base, SESSION_FOLDER, 'scene-insights-session.json')
}

/**
 * Reads the saved session. Returns undefined when there is none, it is malformed, it expires within
 * a minute, or its delegation does not verify (tampered, or not a delegation to its key).
 */
export async function loadSession(
  components: Pick<CliComponents, 'fs'>,
  file: string,
  now: number = Date.now()
): Promise<{ session: InsightsSession; saved: SavedSession } | undefined> {
  const { fs } = components
  if (!(await fs.fileExists(file))) return undefined

  let saved: SavedSession
  try {
    saved = JSON.parse(await fs.readFile(file, 'utf8'))
  } catch {
    return undefined
  }
  if (
    saved?.version !== 1 ||
    typeof saved.expiration !== 'string' ||
    typeof saved.ephemeralIdentity?.privateKey !== 'string' ||
    typeof saved.ephemeralIdentity?.address !== 'string' ||
    !Array.isArray(saved.authChain)
  ) {
    return undefined
  }

  const expiration = new Date(saved.expiration)
  if (!(expiration.getTime() - EXPIRY_MARGIN_MS > now)) return undefined

  const check = await Authenticator.validateSignature(
    saved.ephemeralIdentity.address.toLowerCase(),
    saved.authChain,
    null,
    now,
    { service: INSIGHTS_SERVICE }
  )
  if (
    !check.ok ||
    !check.scope ||
    !INSIGHTS_OPERATIONS.every((operation) => isOperationGranted(check.scope, operation))
  )
    return undefined
  expiration.setTime(Math.min(expiration.getTime(), check.scope.expiration))
  if (!(expiration.getTime() - EXPIRY_MARGIN_MS > now)) return undefined

  return { session: createSessionFromChain(saved.ephemeralIdentity, expiration, saved.authChain), saved }
}

/** Whether git tracks the file, so a .gitignore no longer keeps it out of commits. */
function isTrackedByGit(file: string): Promise<boolean> {
  // exits 0 only for a tracked file; untracked, outside a repository or without git, it fails
  return new Promise((resolve) => {
    execFile('git', ['ls-files', '--error-unmatch', '--', path.basename(file)], { cwd: path.dirname(file) }, (error) =>
      resolve(!error)
    )
  })
}

/**
 * Refuses a session file git already tracks, e.g. a .dcl folder committed before it ignored
 * itself: its .gitignore doesn't stop a tracked file being committed again.
 *
 * @throws CliError `SCENE_INSIGHTS_UNSAFE_SESSION_FILE` when git tracks it.
 */
export async function assertSessionFileIsNotTracked(file: string): Promise<void> {
  const resolved = path.resolve(file)
  if (await isTrackedByGit(resolved)) {
    throw new CliError(
      'SCENE_INSIGHTS_UNSAFE_SESSION_FILE',
      `The session file ${resolved} is tracked by git, so it would be committed. Remove it from the repository ` +
        `(git rm --cached) or set ${SESSION_DIR_ENV} to a folder outside it`
    )
  }
}

/** Makes the session's folder ignore everything in it, so git never adds the session or its temporary copies. */
async function ignoreFolderInGit(components: Pick<CliComponents, 'fs'>, folder: string): Promise<void> {
  const { fs } = components
  const gitignore = path.join(folder, '.gitignore')
  const existing = (await fs.fileExists(gitignore)) ? await fs.readFile(gitignore, 'utf8') : ''
  if (existing.split(/\r?\n/).includes('*')) return
  const separator = existing && !existing.endsWith('\n') ? '\n' : ''
  await fs.appendFile(gitignore, separator + '*\n')
}

/**
 * Saves the session readable only by the user (0600, in a 0700 directory), replacing any other.
 * Its folder's .gitignore ignores everything in it, so git never commits it.
 *
 * @throws CliError `SCENE_INSIGHTS_UNSAFE_SESSION_FILE` when git tracks the file.
 */
export async function saveSession(
  components: Pick<CliComponents, 'fs'>,
  file: string,
  ephemeralIdentity: AuthIdentity['ephemeralIdentity'],
  expiration: Date,
  authChain: AuthChain
): Promise<void> {
  const { fs } = components
  const saved: SavedSession = {
    version: 1,
    address: Authenticator.ownerAddress(authChain),
    expiration: expiration.toISOString(),
    ephemeralIdentity: {
      address: ephemeralIdentity.address,
      publicKey: '0x',
      privateKey: ephemeralIdentity.privateKey
    },
    authChain
  }
  await assertSessionFileIsNotTracked(file)
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  await ignoreFolderInGit(components, path.dirname(file))
  // a fresh file always gets the mode, unlike rewriting an existing one; rename makes it atomic
  const temporary = `${file}.${randomBytes(6).toString('hex')}.tmp`
  await fs.writeFile(temporary, JSON.stringify(saved, null, 2), { mode: 0o600 })
  await fs.rename(temporary, file)
}

/** Removes the saved session. Returns whether there was one. */
export async function deleteSession(components: Pick<CliComponents, 'fs'>, file: string): Promise<boolean> {
  const { fs } = components
  if (!(await fs.fileExists(file))) return false
  await fs.unlink(file)
  return true
}
