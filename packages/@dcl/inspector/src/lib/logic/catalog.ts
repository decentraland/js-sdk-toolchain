import { ComponentName } from '@dcl/asset-packs'
import * as _catalog from '@dcl/asset-packs/catalog.json'
import { getConfig } from './config'

export const catalog = _catalog.assetPacks as unknown as AssetPack[]

// categories obtained from "builder.decentraland.org" catalog
export const CATEGORIES = [
  'decorations',
  'structures',
  'vehicles',
  'furniture',
  'appliances',
  'ground',
  'nature',
  'tiles',
  'year of the pig'
].sort()

export type AssetPack = {
  id: string
  name: string
  thumbnail: string
  assets: Asset[]
}

export type Asset = {
  id: string
  name: string
  category: string
  tags: string[]
  contents: Record<string, string>
  components: Partial<Record<ComponentName, any>>
}

export function getContentsUrl(hash: string) {
  const config = getConfig()
  return `${config.contentUrl}/contents/${hash}`
}

export function getAssetsByCategory(assets: Asset[]) {
  const categories = new Map<Asset['category'], Asset[]>(CATEGORIES.map(($) => [$, []]))
  for (const asset of assets) {
    categories.get(asset.category)!.push(asset)
  }

  return categories
}

export function isSmart(asset: Asset) {
  const components = Object.keys(asset.components)
  return components.length > 1 || (components.length === 1 && components[0] !== 'core::GltfContainer')
}
