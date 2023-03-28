import { AssetNodeFolder } from './types'

export function AssetNodeRootNull(): AssetNodeFolder {
  return { name: '', parent: null, type: 'folder', children: [] }
}

export function buildAssetTree(paths: string[]): AssetNodeFolder {
  const root: AssetNodeFolder = AssetNodeRootNull()

  for (const path of paths) {
    const parts = path.split('/').filter((item) => item.length > 0)
    let currentNode = root

    for (let i = 0; i < parts.length; i++) {
      let childNode = currentNode.children.find((child) => child.name === parts[i])
      if (!childNode) {
        // it's not the last level
        if (i < parts.length - 1) {
          childNode = { name: parts[i], parent: currentNode, type: 'folder', children: [] }
          currentNode.children.push(childNode)
          currentNode = childNode
        } else {
          const lowerPath = path.toLowerCase()
          const assetType = lowerPath.endsWith('.gltf') || lowerPath.endsWith('.glb') ? 'gltf' : 'unknown'
          childNode = {
            name: parts[i],
            parent: currentNode,
            type: 'asset',
            asset: {
              src: path,
              type: assetType
            }
          }
          currentNode.children.push(childNode)
        }
      } else if (childNode.type === 'folder') {
        currentNode = childNode
      } else {
        throw new Error('Impossible condition')
      }
    }
  }

  return root
}
