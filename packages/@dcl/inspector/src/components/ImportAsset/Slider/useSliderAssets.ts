import { useEffect, useState } from 'react'
import { isEmote } from '../../AssetPreview/utils'
import { Asset } from '../types'
import { AssetWithEmote } from './types'

export function useSliderAssets(_assets: Asset[]) {
  const [assets, setAssets] = useState<AssetWithEmote[]>([])

  const hasEmoteName = (asset: Asset) => {
    return asset.name.endsWith('_emote')
  }

  const processAssets = async (assetsToProcess: Asset[]) => {
    try {
      const newAssets = await Promise.all(
        assetsToProcess.map(async (asset) => {
          const isEmoteFile = await isEmote(asset.blob)
          return {
            ...asset,
            isEmote: isEmoteFile,
            name: isEmoteFile && !hasEmoteName(asset) ? `${asset.name}_emote` : asset.name
          }
        })
      )
      setAssets(newAssets)
    } catch (error) {
      console.error('Error processing assets:', error)
      setAssets([])
    }
  }

  useEffect(() => {
    void processAssets(_assets)
  }, [_assets])

  return { assets, setAssets }
}
