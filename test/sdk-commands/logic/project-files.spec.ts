import {
  b64ContentVersionedHashingFunction,
  b64HashDecodingFunction,
  b64HashingFunction
} from '../../../packages/@dcl/sdk-commands/src/logic/project-files'

describe('project-files preview hashing', () => {
  const mtimeMs = 1786032377138.4

  describe('b64HashDecodingFunction', () => {
    it('decodes a plain (path-only) id back to its path', () => {
      const path = '/home/user/scene/assets/models/tree.glb'
      expect(b64HashDecodingFunction(b64HashingFunction(path))).toBe(path)
    })

    it('decodes a content-versioned id back to its path', () => {
      const path = '/home/user/scene/assets/models/tree.glb'
      expect(b64HashDecodingFunction(b64ContentVersionedHashingFunction(path, mtimeMs))).toBe(path)
    })

    it('decodes paths containing spaces, hyphens and digits', () => {
      const path = '/home/user/My Projects/scene-2/assets/UI PhotoMural 01.png'
      expect(b64HashDecodingFunction(b64HashingFunction(path))).toBe(path)
      expect(b64HashDecodingFunction(b64ContentVersionedHashingFunction(path, mtimeMs))).toBe(path)
    })
  })

  describe('b64ContentVersionedHashingFunction', () => {
    it('produces a different id when the mtime changes and the same id when it does not', () => {
      const path = '/home/user/scene/assets/models/tree.glb'
      expect(b64ContentVersionedHashingFunction(path, mtimeMs)).toBe(b64ContentVersionedHashingFunction(path, mtimeMs))
      expect(b64ContentVersionedHashingFunction(path, mtimeMs)).not.toBe(
        b64ContentVersionedHashingFunction(path, mtimeMs + 1000)
      )
    })

    it('ignores sub-millisecond mtime precision', () => {
      const path = '/home/user/scene/assets/models/tree.glb'
      expect(b64ContentVersionedHashingFunction(path, 1000.25)).toBe(b64ContentVersionedHashingFunction(path, 1000.75))
    })

    it('marks versioned ids with a NUL byte, absent from plain ids', () => {
      // Clients detect a version-capable server by this byte: file paths and hostnames cannot
      // contain NUL, so it can never appear in a plain `path-machineId` id.
      const path = '/home/user/scene/assets/models/tree.glb'
      const decode = (hash: string) => Buffer.from(hash.replace(/^b64-/, ''), 'base64').toString('utf8')
      expect(decode(b64ContentVersionedHashingFunction(path, mtimeMs))).toContain('\u0000')
      expect(decode(b64HashingFunction(path))).not.toContain('\u0000')
    })
  })
})
