import * as utils from './utils'

describe('GltfInspector/utils', () => {
  describe('fromGltf', () => {
    it('should return a "PBGltfContainer" schema', () => {
      const result = { src: 'some-path' }
      expect(utils.fromGltf(result)).toStrictEqual(result)
    })
  })
  describe('toGltf', () => {
    it('should return a "PBGltfContainer" schema', () => {
      const result = { src: 'some-path' }
      expect(utils.fromGltf(result)).toStrictEqual(result)
    })
  })
  describe('isValidInput', () => {
    it('should return true when the file is found', () => {
      const assets = {
        basePath: 'root',
        assets: [
          {
            path: 'root/path'
          }
        ]
      }
      expect(utils.isValidInput(assets, 'root/path')).toBe(true)
    })
    it('should return false when the file is not found', () => {
      const assets = {
        basePath: 'root',
        assets: [
          {
            path: 'root/path'
          }
        ]
      }
      expect(utils.isValidInput(assets, 'root/other-path')).toBe(false)
    })
  })
})
