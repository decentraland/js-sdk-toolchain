// Local Scene Development identity and the Pulse realm key.
// Pulse matches realms by exact string and nothing is exchanged, so a derivation
// that drifts is invisible: peers just never see each other.
// Contract and caveats: docs/lsd-identity-and-pulse-realm.md
import { createHash } from 'crypto'
import { b64HashingFunction } from './project-files'

/** Pulse's `MaxRealmLength`. */
export const PULSE_MAX_REALM_LENGTH = 255

const LSD_REALM_PREFIX = 'lsd:'
const LSD_REALM_HASHED_PREFIX = 'lsd:sha256:'

/** The scene entity id the preview server already serves, reused verbatim. */
export function lsdPreviewSceneId(projectRoot: string): string {
  return b64HashingFunction(projectRoot)
}

export function lsdRealmKey(projectRoot: string): string {
  const previewSceneId = lsdPreviewSceneId(projectRoot)
  const realmKey = LSD_REALM_PREFIX + previewSceneId

  // hashed, not truncated: every party must land on the same string unprompted
  if (realmKey.length <= PULSE_MAX_REALM_LENGTH) return realmKey

  return LSD_REALM_HASHED_PREFIX + createHash('sha256').update(previewSceneId).digest('hex')
}

// Off until bevy-headless declares `--pulse-realm` support; flip to `true` then,
// leaving `DCL_SERVER_PULSE_REALM=0` as the opt-out.
const PULSE_REALM_DEFAULT = false

export function pulseRealmEnabled(): boolean {
  const requested = process.env.DCL_SERVER_PULSE_REALM
  if (!requested) return PULSE_REALM_DEFAULT
  return requested === '1' || requested.toLowerCase() === 'true'
}

export function pulseRealmArgs(projectRoot: string): string[] {
  if (!pulseRealmEnabled()) return []
  return [`--pulse-realm=${lsdRealmKey(projectRoot)}`]
}
