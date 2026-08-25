import { createHash } from 'crypto'
import { mkdtemp, writeFile } from 'fs/promises'
import os from 'os'
import path from 'path'
import {
  PULSE_MAX_REALM_LENGTH,
  lsdPreviewSceneId,
  lsdRealmKey,
  pulseRealmArgs,
  pulseRealmEnabled
} from '../../../packages/@dcl/sdk-commands/src/logic/lsd-realm'
import { b64HashingFunction, machineId } from '../../../packages/@dcl/sdk-commands/src/logic/project-files'

// Pulse matches realms by exact string, so a drifting derivation fails silently.
// Contract: docs/lsd-identity-and-pulse-realm.md
const PROJECT_ROOT = '/home/dev/my-scene'

describe('LSD preview scene id', () => {
  it('is the shared b64HashingFunction, not a second derivation', () => {
    expect(lsdPreviewSceneId(PROJECT_ROOT)).toEqual(b64HashingFunction(PROJECT_ROOT))
  })

  it('encodes `${absoluteProjectRoot}-${machineId}` as documented', () => {
    const expected = 'b64-' + Buffer.from(`${PROJECT_ROOT}-${machineId}`).toString('base64')

    expect(lsdPreviewSceneId(PROJECT_ROOT)).toEqual(expected)
  })
})

describe('LSD Pulse realm key', () => {
  it('prefixes the preview scene id with `lsd:`', () => {
    expect(lsdRealmKey(PROJECT_ROOT)).toEqual(`lsd:${b64HashingFunction(PROJECT_ROOT)}`)
  })

  it('gives different projects different realms', () => {
    expect(lsdRealmKey('/home/dev/scene-a')).not.toEqual(lsdRealmKey('/home/dev/scene-b'))
  })

  it('does not change when the project contents change', async () => {
    // the realm must survive edits and reloads; a content- or mtime-shaped
    // derivation would re-partition comms on every file save
    const projectRoot = await mkdtemp(path.join(os.tmpdir(), 'lsd-realm-'))
    const before = lsdRealmKey(projectRoot)

    await writeFile(path.join(projectRoot, 'game.ts'), 'export const a = 1')
    await writeFile(path.join(projectRoot, 'game.ts'), 'export const a = 2')

    expect(lsdRealmKey(projectRoot)).toEqual(before)
  })

  describe('when the raw key would exceed Pulse MaxRealmLength', () => {
    // base64 lengths are multiples of 4, so no root yields exactly 255; grow the
    // root until the rule trips and assert on the keys straddling the boundary
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

    it('produces a key that fits', () => {
      expect(boundary.firstHashed).toMatch(/^lsd:sha256:[0-9a-f]{64}$/)
      expect(boundary.firstHashed.length).toBeLessThanOrEqual(PULSE_MAX_REALM_LENGTH)
    })
  })
})

describe('the --pulse-realm gate', () => {
  const original = process.env.DCL_SERVER_PULSE_REALM

  afterEach(() => {
    if (original === undefined) delete process.env.DCL_SERVER_PULSE_REALM
    else process.env.DCL_SERVER_PULSE_REALM = original
  })

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

    expect(pulseRealmArgs(PROJECT_ROOT)).toEqual([])
  })

  it('contributes one flag when enabled', () => {
    process.env.DCL_SERVER_PULSE_REALM = '1'

    expect(pulseRealmArgs(PROJECT_ROOT)).toEqual([`--pulse-realm=${lsdRealmKey(PROJECT_ROOT)}`])
  })
})
