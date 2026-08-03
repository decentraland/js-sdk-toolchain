import {
  b64UrlHashDecodingFunction,
  b64UrlHashingFunction
} from '../../../packages/@dcl/sdk-commands/src/logic/project-files'

describe('project-files b64url hashing', () => {
  // '~~~' encodes to 'fn5-' (base64url) vs 'fn5+' (base64); '???' to 'Pz8_' vs 'Pz8/'
  const paths = [
    '/home/user/project',
    '/home/user/project/models/tree.glb',
    'C:\\Users\\user\\project\\scene.json',
    '/home/user/~~~/???/scene.json',
    '/home/üser/日本語/scène.ts'
  ]

  it.each(paths)('round-trips %s through encode and decode', (path) => {
    expect(b64UrlHashDecodingFunction(b64UrlHashingFunction(path))).toBe(path)
  })

  it.each(paths)('produces url- and directory-safe hashes for %s', (path) => {
    const hash = b64UrlHashingFunction(path)
    expect(hash).toMatch(/^b64-[A-Za-z0-9_-]+$/)
  })
})
