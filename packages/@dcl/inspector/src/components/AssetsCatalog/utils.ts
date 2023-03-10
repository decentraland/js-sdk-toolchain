import { CATEGORIES, IAsset } from './types'

export function getThemeThumbnailUrl(thumbnail: string) {
  return `https://builder-api.decentraland.org/v1/storage/assetPacks/${thumbnail}`
}

export function getStorageUrl(hash: string) {
  return `https://builder-api.decentraland.org/v1/storage/contents/${hash}`
}

export function getAssetsByCategory(assets: IAsset[]) {
  const categories = new Map<IAsset['category'], IAsset[]>(CATEGORIES.map(($) => [$, []]))
  for (const asset of assets) {
    categories.get(asset.category)!.push(asset)
  }

  return categories
}
