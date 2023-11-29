import { ComponentName } from '@dcl/asset-packs'
import * as _catalog from '@dcl/asset-packs/catalog.json'
import { CoreComponents } from '../sdk/components'
import { getConfig } from './config'

export const catalog = _catalog.assetPacks as unknown as AssetPack[]

// categories obtained from "builder.decentraland.org" catalog
export const CATEGORIES = [
  'ground',
  'utils',
  'buttons',
  'chests',
  'levers',
  'doors',
  'platforms',
  'decorations',
  'structures',
  'vehicles',
  'furniture',
  'appliances',
  'nature',
  'tiles',
  'year of the pig'
]

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

export function isSmart(asset: Partial<Asset>) {
  const components = Object.keys(asset?.components ?? {})
  return (
    components.length > 1 &&
    components.some((component) =>
      [ComponentName.ACTIONS, ComponentName.TRIGGERS].find(($) => $.toString() === component)
    )
  )
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
