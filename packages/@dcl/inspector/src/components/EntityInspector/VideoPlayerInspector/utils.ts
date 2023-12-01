import { PBVideoPlayer } from '@dcl/ecs'

import { removeBasePath } from '../../../lib/logic/remove-base-path'
import { AssetCatalogResponse } from '../../../tooling-entrypoint'
import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import { isAssetNode } from '../../ProjectAssetExplorer/utils'
import { AssetNodeItem } from '../../ProjectAssetExplorer/types'
import { VideoPlayerInput } from './types'
import { isValidHttpsUrl } from '../../../lib/utils/url'

const getPath = (base: string, src: string) => (base ? base + '/' + src : src)

export const fromVideoPlayer =
  (base: string) =>
  (value: PBVideoPlayer): VideoPlayerInput => {
    return {
      src: removeBasePath(base, value.src),
      loop: value.loop,
      playing: value.playing,
      volume: volumeFromVideoPlayer(value.volume)
    }
  }

export const toVideoPlayer =
  (base: string) =>
  (value: VideoPlayerInput): PBVideoPlayer => {
    return {
      src: isValidHttpsUrl(value.src) ? value.src : getPath(base, value.src),
      loop: value.loop,
      playing: value.playing,
      volume: volumeToVideoPlayer(value.volume)
    }
  }

export function volumeFromVideoPlayer(volume: number | undefined): string {
  const value = (volume ?? 1.0) * 100
  return parseInt(value.toFixed(2)).toString()
}

export function volumeToVideoPlayer(volume: string | undefined): number {
  const value = parseFloat(volume ?? '0')
  return parseFloat((value / 100).toFixed(2))
}

export function isValidInput({ basePath, assets }: AssetCatalogResponse, src: string): boolean {
  return isValidHttpsUrl(src) || !!assets.find(($) => (basePath ? basePath + '/' + src : src) === $.path)
}

export const isVideoFile = (value: string): boolean => value.endsWith('.mp4')
export const isVideo = (node: TreeNode): node is AssetNodeItem => isAssetNode(node) && isVideoFile(node.name)

export function isValidVolume(volume: string | undefined): boolean {
  const value = (volume ?? 0).toString()
  return !isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 100
}
