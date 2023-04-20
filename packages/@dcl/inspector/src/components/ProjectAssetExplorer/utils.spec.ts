import * as utils from './utils'

import { AssetNodeFolder, AssetNodeItem } from './types'

describe('ProjectAssetExplorer/utils', () => {
  describe('getFullNodePath', () => {
    it('should return full node path given a child', () => {
      const parentA = { name: 'parentA', parent: null }
      const parentB = { name: 'parentB', parent: parentA }
      const child = { name: 'file.gltf', parent: parentB } as AssetNodeItem
      expect(utils.getFullNodePath(child)).toBe('/parentA/parentB/file.gltf')
    })
    it('should return child name if node has no parent', () => {
      const child = { name: 'file.gltf', parent: null } as AssetNodeItem
      expect(utils.getFullNodePath(child)).toBe('/file.gltf')
    })
  })
  describe('isAssetNode', () => {
    it('should return true when node type "asset"', () => {
      const node: AssetNodeItem = {
        name: 'some-name',
        parent: null,
        type: 'asset',
        asset: {
          src: 'some-file.glb',
          type: 'gltf'
        }
      }
      expect(utils.isAssetNode(node)).toBe(true)
    })
    it('should return false when node type is different from "asset"', () => {
      const node: AssetNodeFolder = {
        name: 'some-name',
        parent: null,
        type: 'folder',
        children: []
      }
      expect(utils.isAssetNode(node)).toBe(false)
    })
  })
})
