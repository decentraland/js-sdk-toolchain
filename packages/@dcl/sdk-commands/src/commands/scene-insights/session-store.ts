import { homedir } from 'os'
import path from 'path'
import { randomBytes } from 'crypto'
import { AuthChain, AuthIdentity, Authenticator } from '@dcl/crypto'

import { CliComponents } from '../../components'
import { InsightsSession, createSessionFromChain } from './session'

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

  const check = await Authenticator.validateSignature(saved.ephemeralIdentity.address, saved.authChain, null, now)
  if (!check.ok) return undefined

  return { session: createSessionFromChain(saved.ephemeralIdentity, expiration, saved.authChain), saved }
}

/** Saves the session readable only by the user (0600, in a 0700 directory), replacing any other. */
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
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 })
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
