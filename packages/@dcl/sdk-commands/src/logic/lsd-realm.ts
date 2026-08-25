/**
 * Local Scene Development (LSD) identity and the Pulse realm key.
 *
 * Pulse partitions visibility by exact realm-string match and nothing is
 * exchanged: the CLI, unity-explorer and bevy-explorer each derive the string
 * independently. Drift between two derivations is therefore invisible — peers
 * simply never see each other — which is why this contract lives in one place.
 * See docs/lsd-identity-and-pulse-realm.md.
 */
import { createHash } from 'crypto'
import { b64HashingFunction } from './project-files'

/** Pulse's `MaxRealmLength`. Longer realm strings are rejected. */
export const PULSE_MAX_REALM_LENGTH = 255

const LSD_REALM_PREFIX = 'lsd:'
const LSD_REALM_HASHED_PREFIX = 'lsd:sha256:'

/**
 * `b64-` + base64(`${absoluteProjectRoot}-${machineId}`).
 *
 * Deliberately the same {@link b64HashingFunction} the preview server already
 * hands clients as the scene's entity id, not a parallel derivation. It is a
 * function of the project root alone: per-file preview hashes are mtime-versioned
 * but the project directory's own id stays path-only, so deriving the realm from
 * a content entry would re-partition comms on every file save.
 */
export function lsdPreviewSceneId(projectRoot: string): string {
  return b64HashingFunction(projectRoot)
}

/**
 * The Pulse realm key for a local preview.
 *
 * Long project paths can push the raw key past Pulse's limit, so it collapses to
 * a hash of the same input rather than being truncated — every party has to land
 * on the identical string without coordinating.
 */
export function lsdRealmKey(projectRoot: string): string {
  const previewSceneId = lsdPreviewSceneId(projectRoot)
  const realmKey = LSD_REALM_PREFIX + previewSceneId

  if (realmKey.length <= PULSE_MAX_REALM_LENGTH) return realmKey

  return LSD_REALM_HASHED_PREFIX + createHash('sha256').update(previewSceneId).digest('hex')
}

// Flip to `true` once a bevy-headless release declares `--pulse-realm` support;
// `DCL_SERVER_PULSE_REALM=0` stays the opt-out afterwards.
const PULSE_REALM_DEFAULT = false

/**
 * bevy-headless has no Pulse transport in server mode yet
 * (decentraland/sdk-multiplayer-server#132), and once bevy-explorer#1030 lands the
 * headless binary exits 2 on arguments it used to ignore — so passing the realm
 * unconditionally today would break every preview on the default engine.
 */
export function pulseRealmEnabled(): boolean {
  const requested = process.env.DCL_SERVER_PULSE_REALM
  if (!requested) return PULSE_REALM_DEFAULT
  return requested === '1' || requested.toLowerCase() === 'true'
}

/** The realm arguments for the spawned engine — identical for bevy and hammurabi. */
export function pulseRealmArgs(projectRoot: string): string[] {
  if (!pulseRealmEnabled()) return []
  return [`--pulse-realm=${lsdRealmKey(projectRoot)}`]
}
