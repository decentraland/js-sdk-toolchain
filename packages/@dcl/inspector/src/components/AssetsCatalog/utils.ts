import { getConfig } from '../../lib/logic/config'
import { Asset, CATEGORIES } from './types'

export function getContentsUrl(hash: string) {
  const config = getConfig()
  return `${config.catalogUrl}/contents/${hash}`
}

export function getAssetsByCategory(assets: Asset[]) {
  const categories = new Map<Asset['category'], Asset[]>(CATEGORIES.map(($) => [$, []]))
  for (const asset of assets) {
    categories.get(asset.category)!.push(asset)
  }

  return categories
}
