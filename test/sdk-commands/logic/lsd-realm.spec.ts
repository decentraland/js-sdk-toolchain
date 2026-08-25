import { createHash } from 'crypto'
import {
  PULSE_MAX_REALM_LENGTH,
  lsdPreviewSceneId,
  lsdRealmKey,
  pulseRealmArgs,
  pulseRealmEnabled
} from '../../../packages/@dcl/sdk-commands/src/logic/lsd-realm'
import { b64HashingFunction, machineId } from '../../../packages/@dcl/sdk-commands/src/logic/project-files'

/**
 * The LSD identity contract (see docs/lsd-identity-and-pulse-realm.md).
 *
 * Pulse partitions visibility by exact realm-string match: every party derives
 * the string independently and there is no key exchange, so any drift between
 * the CLI and an explorer is an invisible "my friend can't see me" bug rather
 * than a connection error. These tests pin the derivation.
 */
describe('LSD preview scene id', () => {
  it('is the shared b64HashingFunction, not a second derivation', () => {
    const projectRoot = '/home/dev/my-scene'

    expect(lsdPreviewSceneId(projectRoot)).toEqual(b64HashingFunction(projectRoot))
  })

  it('encodes `${absoluteProjectRoot}-${machineId}` as documented', () => {
    const projectRoot = '/home/dev/my-scene'

    const expected = 'b64-' + Buffer.from(`${projectRoot}-${machineId}`).toString('base64')
    expect(lsdPreviewSceneId(projectRoot)).toEqual(expected)
  })
})

describe('LSD Pulse realm key', () => {
  it('prefixes the preview scene id with `lsd:`', () => {
    const projectRoot = '/home/dev/my-scene'

    expect(lsdRealmKey(projectRoot)).toEqual(`lsd:${b64HashingFunction(projectRoot)}`)
  })

  it('derives from the project root alone, so it survives edits and reloads', () => {
    // PR #1529 versions per-file preview hashes by mtime but keeps the project
    // directory's own entity id path-only. Deriving the realm key from anything
    // content- or mtime-shaped would re-partition comms on every file save.
    const projectRoot = '/home/dev/my-scene'

    expect(lsdRealmKey(projectRoot)).toEqual(lsdRealmKey(projectRoot))
  })

  it('gives different projects different realms', () => {
    expect(lsdRealmKey('/home/dev/scene-a')).not.toEqual(lsdRealmKey('/home/dev/scene-b'))
  })

  describe('when the raw key would exceed Pulse MaxRealmLength', () => {
    // base64 output length is always a multiple of 4, so no project root yields a
    // raw key of exactly 255 chars. Grow the root until the rule trips and assert
    // on the two keys straddling the boundary.
    const boundary = (() => {
      for (let length = 1; length < 1024; length++) {
        const root = '/home/dev/' + 'x'.repeat(length)
        const key = lsdRealmKey(root)
        if (key.startsWith('lsd:sha256:')) {
          return { lastRaw: lsdRealmKey('/home/dev/' + 'x'.repeat(length - 1)), firstHashed: key, root }
        }
      }
      throw new Error('the overflow rule never tripped')
    })()

    it('keeps the raw form while it fits', () => {
      expect(boundary.lastRaw).toMatch(/^lsd:b64-/)
      expect(boundary.lastRaw.length).toBeLessThanOrEqual(PULSE_MAX_REALM_LENGTH)
    })

    it('falls back to `lsd:sha256:` + SHA256Hex(previewSceneId)', () => {
      const expected = 'lsd:sha256:' + createHash('sha256').update(lsdPreviewSceneId(boundary.root)).digest('hex')

      expect(boundary.firstHashed).toEqual(expected)
    })

    it('produces a key that fits, deterministically', () => {
      expect(boundary.firstHashed).toMatch(/^lsd:sha256:[0-9a-f]{64}$/)
      expect(boundary.firstHashed.length).toBeLessThanOrEqual(PULSE_MAX_REALM_LENGTH)
      expect(lsdRealmKey(boundary.root)).toEqual(boundary.firstHashed)
    })
  })
})

describe('the --pulse-realm gate', () => {
  const original = process.env.DCL_SERVER_PULSE_REALM

  afterEach(() => {
    if (original === undefined) delete process.env.DCL_SERVER_PULSE_REALM
    else process.env.DCL_SERVER_PULSE_REALM = original
  })

  // bevy-explorer#1030 makes the headless binary exit 2 on arguments it used to
  // ignore, so the flag stays opt-in until bevy-headless declares support.
  it('is off unless opted into', () => {
    delete process.env.DCL_SERVER_PULSE_REALM
    expect(pulseRealmEnabled()).toBe(false)

    process.env.DCL_SERVER_PULSE_REALM = ''
    expect(pulseRealmEnabled()).toBe(false)
  })

  it('accepts 1/true, case-insensitively', () => {
    for (const value of ['1', 'true', 'TRUE', 'True']) {
      process.env.DCL_SERVER_PULSE_REALM = value
      expect(pulseRealmEnabled()).toBe(true)
    }
  })

  it('treats any other value as off', () => {
    for (const value of ['0', 'false', 'yes', 'no']) {
      process.env.DCL_SERVER_PULSE_REALM = value
      expect(pulseRealmEnabled()).toBe(false)
    }
  })

  it('contributes no arguments while gated off', () => {
    delete process.env.DCL_SERVER_PULSE_REALM

    expect(pulseRealmArgs('/home/dev/my-scene')).toEqual([])
  })

  it('contributes one engine-agnostic flag when enabled', () => {
    process.env.DCL_SERVER_PULSE_REALM = '1'

    expect(pulseRealmArgs('/home/dev/my-scene')).toEqual([`--pulse-realm=${lsdRealmKey('/home/dev/my-scene')}`])
  })
})
