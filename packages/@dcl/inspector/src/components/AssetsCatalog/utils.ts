import { Asset, CATEGORIES } from './types'

export function getContentsUrl(hash: string) {
  return `https://builder-items.decentraland.org/contents/${hash}`
}

export function getAssetsByCategory(assets: Asset[]) {
  const categories = new Map<Asset['category'], Asset[]>(CATEGORIES.map(($) => [$, []]))
  for (const asset of assets) {
    categories.get(asset.category)!.push(asset)
  }

  return categories
}
