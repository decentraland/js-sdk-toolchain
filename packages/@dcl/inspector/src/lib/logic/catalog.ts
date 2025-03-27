import { Catalog, AssetPack, Asset, AssetData } from '@dcl/asset-packs'
import { CoreComponents } from '../sdk/components'
import { getConfig } from './config'
import * as _catalog from '@dcl/asset-packs/catalog.json'

export const catalog = (_catalog as unknown as Catalog).assetPacks

export { Catalog, AssetPack, Asset, AssetData }

export type CustomAsset = AssetData & {
  resources: string[]
  thumbnail?: string
}

// categories obtained from "builder-items.decentraland.org" catalog
export const CATEGORIES = [
  'ground',
  'utils',
  'buttons',
  'chests',
  'levers',
  'doors',
  'platforms',
  'social',
  'decorations',
  'structures',
  'vehicles',
  'furniture',
  'appliances',
  'nature',
  'tiles',
  'year of the pig',
  'health',
  'sounds',
  'primitives',
  'pillars',
  'other'
]

export function getContentsUrl(hash: string) {
  const config = getConfig()
  return `${config.contentUrl}/contents/${hash}`
}

export function getAssetsByCategory(assets: Asset[]) {
  const categories = new Map<Asset['category'], Asset[]>(CATEGORIES.map(($) => [$, []]))
  for (const asset of assets) {
    const list = categories.get(asset.category)
    if (list) {
      list.push(asset)
    } else {
      if (asset.category) {
        categories.set(asset.category, [asset])
      } else {
        categories.set('other', [asset])
      }
    }
  }

  return categories
}

export function isSmart(asset: Partial<Asset>) {
  const components = asset?.composite?.components ?? []
  // when the item has more than one component, it is smart
  if (components.length > 1) {
    return true
    // when the item has a single component but it's not a GltfContainer, then it's also smart
  } else if (components.length === 1 && components[0].name !== CoreComponents.GLTF_CONTAINER) {
    return true
  }
  // when the item only has a GltfContainer then it's not smart
  return false
}

export function isGround(asset: Partial<Asset>) {
  return asset.category === 'ground'
}

export function getAssetByModel(path: string) {
  // Validates the path is a model and cames from the catalog
  if (path.endsWith('.glb') && path.split('/').length === 4) {
    const [model, name, _] = path.split('/').reverse()
    for (const assetPack of catalog) {
      for (const asset of assetPack.assets) {
        if (!!asset.contents[model] && asset.name.trim().replaceAll(' ', '_').toLowerCase() === name.toLowerCase()) {
          return asset
        }
      }
    }
  }

  return null
}

export function getAssetById(id: string) {
  for (const assetPack of catalog) {
    for (const asset of assetPack.assets) {
      if (asset.id === id) {
        return asset
      }
    }
  }

  return null
}
