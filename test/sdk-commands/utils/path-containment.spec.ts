import path from 'path'
import { resolvePathInside } from '../../../packages/@dcl/sdk-commands/src/commands/start/server/path'

describe('resolvePathInside', () => {
  describe('when the requested path is inside the root', () => {
    let root: string
    let requestedPath: string

    beforeEach(() => {
      root = path.resolve('tmp', 'scene')
      requestedPath = 'assets/model.glb'
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should return the absolute contained path', () => {
      expect(resolvePathInside(root, requestedPath)).toBe(path.join(root, requestedPath))
    })
  })

  describe('when the requested path traverses above the root', () => {
    let root: string
    let requestedPath: string

    beforeEach(() => {
      root = path.resolve('tmp', 'scene')
      requestedPath = '../private.txt'
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should reject the escaped path', () => {
      expect(resolvePathInside(root, requestedPath)).toBeUndefined()
    })
  })

  describe('when an absolute path only shares the root prefix', () => {
    let root: string
    let requestedPath: string

    beforeEach(() => {
      root = path.resolve('tmp', 'scene')
      requestedPath = path.resolve('tmp', 'scene-secret', 'private.txt')
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should reject the sibling path', () => {
      expect(resolvePathInside(root, requestedPath)).toBeUndefined()
    })
  })
})
