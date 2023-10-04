import { getNode } from '../../../lib/sdk/drag-drop'
import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import { AssetNodeItem } from '../../ProjectAssetExplorer/types'
import * as utils from './utils'

describe('GltfInspector/utils', () => {
  describe('fromGltf', () => {
    it('should return a "PBGltfContainer" schema', () => {
      const result = {
        src: 'some-path',
        invisibleMeshesCollisionMask: 2,
        visibleMeshesCollisionMask: 0
      }
      expect(utils.fromGltf('')(result)).toStrictEqual({
        src: 'some-path',
        invisibleMeshesCollisionMask: '2',
        visibleMeshesCollisionMask: '0'
      })
    })
  })
  describe('toGltf', () => {
    it('should return a "PBGltfContainer" schema', () => {
      const result = {
        src: 'some-path',
        invisibleMeshesCollisionMask: '2',
        visibleMeshesCollisionMask: '0'
      }
      expect(utils.toGltf('')(result)).toStrictEqual({
        src: 'some-path',
        invisibleMeshesCollisionMask: 2,
        visibleMeshesCollisionMask: 0
      })
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
      expect(utils.isValidInput(assets, 'path')).toBe(true)
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
  describe('isAsset', () => {
    it('should return true if value has ".gltf" or ".glb" extension', () => {
      expect(utils.isAsset('test.gltf')).toBe(true)
      expect(utils.isAsset('test.glb')).toBe(true)
      expect(utils.isAsset('test.dll')).toBe(false)
      expect(utils.isAsset('test.gltff')).toBe(false)
    })
  })
  describe('isModel', () => {
    it('should return true if value is an "AssetNodeItem"', () => {
      const validNodeItem: AssetNodeItem = {
        type: 'asset',
        name: 'balloon.glb',
        parent: null,
        asset: { type: 'gltf', src: 'some/path' }
      }
      const invalidNodeItem = { ...validNodeItem, type: 'wrong' } as any
      expect(utils.isModel(validNodeItem)).toBe(true)
      expect(utils.isModel(invalidNodeItem)).toBe(false)
    })
  })
  describe('getModel', () => {
    it('should get the model from a tree when found', () => {
      const buildAssetNode = (name: string, parent?: TreeNode): TreeNode => {
        if (parent?.children) parent.children.push(name)
        const path = `${name}.gltf`
        return {
          name: path,
          parent: parent ?? null,
          type: 'asset',
          asset: { src: path, type: 'gltf' }
        } as TreeNode
      }
      const buildFolderNode = (name: string, parent?: TreeNode): TreeNode => {
        if (parent?.children) parent.children.push(name)
        return {
          name,
          parent: parent ?? null,
          type: 'folder',
          children: []
        } as TreeNode
      }

      const root = buildFolderNode('root')
      const folder = buildFolderNode('folder', root)
      const asset = buildAssetNode('asset', folder)
      const tree: Map<string, TreeNode> = new Map([
        ['root', root],
        ['folder', folder],
        ['asset', asset]
      ])
      const incompleteTree: Map<string, TreeNode> = new Map([
        ['root', root],
        ['folder', folder]
      ])

      expect(getNode(root, tree, utils.isModel)).toBe(null)
      expect(getNode(folder, tree, utils.isModel)).toBe(asset)
      expect(getNode(asset, tree, utils.isModel)).toBe(asset)
      // need to create a new object since we are memoizing this function...
      expect(getNode({ ...folder }, incompleteTree, utils.isModel)).toBe(null)
    })
  })
})
