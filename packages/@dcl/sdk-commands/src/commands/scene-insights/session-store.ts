import { homedir } from 'os'
import path from 'path'
import { randomBytes } from 'crypto'
import ignore from 'ignore'
import { AuthChain, AuthIdentity, Authenticator, isOperationGranted } from '@dcl/crypto'

import { CliComponents } from '../../components'
import { getDCLIgnorePatterns } from '../../logic/dcl-ignore'
import { CliError } from '../../logic/error'
import { InsightsSession, createSessionFromChain, INSIGHTS_SERVICE, INSIGHTS_OPERATIONS } from './session'

/** Environment variable that moves the saved session, e.g. into a sandbox an agent can read. */
export const SESSION_FILE_ENV = 'DCL_SCENE_INSIGHTS_SESSION_FILE'

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

export function getSessionFilePath(): string {
  return process.env[SESSION_FILE_ENV] || path.resolve(homedir(), '.dcl', 'scene-insights-session.json')
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

/**
 * Refuses a session file that a deploy would upload, publicly, with a scene: one inside a scene
 * project (the nearest folder above it with a scene.json) that the project's deploy rules don't
 * ignore. The default file is in the home directory; this catches SESSION_FILE_ENV pointing into a
 * project, e.g. ./creds/session.json. Dot folders such as ./.dcl/ are never deployed.
 *
 * @throws CliError `SCENE_INSIGHTS_UNSAFE_SESSION_FILE` when a deploy would upload it.
 */
export async function assertSessionFileIsNotDeployed(
  components: Pick<CliComponents, 'fs'>,
  file: string
): Promise<void> {
  const { fs } = components
  const resolved = path.resolve(file)
  let directory = path.dirname(resolved)
  for (;;) {
    if (await fs.fileExists(path.join(directory, 'scene.json'))) {
      const relative = path.relative(directory, resolved).split(path.sep).join('/')
      const deployRules = ignore().add(await getDCLIgnorePatterns(components, directory))
      if (!deployRules.ignores(relative)) {
        throw new CliError(
          'SCENE_INSIGHTS_UNSAFE_SESSION_FILE',
          `The session file ${resolved} is inside the scene project at ${directory}, and deploying the scene ` +
            `would publish it. Set ${SESSION_FILE_ENV} to a path outside the project, or inside a dot folder ` +
            'such as .dcl/'
        )
      }
      return
    }
    const parent = path.dirname(directory)
    if (parent === directory) return
    directory = parent
  }
}

/** Escapes a file name for a .gitignore pattern. */
function gitignorePattern(name: string): string {
  return name.replace(/[\\*?[\]!# ]/g, '\\$&')
}

/**
 * Lists the session file (and its temporary copies) in a .gitignore in its own folder, created if
 * missing, so git never commits it, whichever repository that folder is in.
 */
async function ignoreSessionInGit(components: Pick<CliComponents, 'fs'>, file: string): Promise<void> {
  const { fs } = components
  const gitignore = path.join(path.dirname(file), '.gitignore')
  const name = gitignorePattern(path.basename(file))
  const entries = [`/${name}`, `/${name}.*.tmp`]
  const existing = (await fs.fileExists(gitignore)) ? await fs.readFile(gitignore, 'utf8') : ''
  const lines = existing.split(/\r?\n/)
  const missing = entries.filter((entry) => !lines.includes(entry))
  if (missing.length === 0) return
  const separator = existing && !existing.endsWith('\n') ? '\n' : ''
  await fs.appendFile(gitignore, separator + missing.join('\n') + '\n')
}

/**
 * Saves the session readable only by the user (0600, in a 0700 directory), replacing any other.
 * Its folder's .gitignore lists it, so git never commits it.
 *
 * @throws CliError `SCENE_INSIGHTS_UNSAFE_SESSION_FILE` when a deploy would upload the file.
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
  await assertSessionFileIsNotDeployed(components, file)
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
  await ignoreSessionInGit(components, file)
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
