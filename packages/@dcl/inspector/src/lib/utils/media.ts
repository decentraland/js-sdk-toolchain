import { TreeNode } from '../../components/ProjectAssetExplorer/ProjectView'
import { AssetNodeItem } from '../../components/ProjectAssetExplorer/types'
import { isAssetNode } from '../../components/ProjectAssetExplorer/utils'

export function volumeFromMediaSource(volume: number | undefined): string {
  const value = (volume ?? 1.0) * 100
  return parseInt(value.toFixed(2)).toString()
}

export function volumeToMediaSource(volume: string | undefined): number {
  const value = parseFloat(volume ?? '0')
  return parseFloat((value / 100).toFixed(2))
}

export function isValidVolume(volume: string | undefined): boolean {
  const value = (volume ?? 0).toString()
  return !isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 100
}

export const isAudioFile = (value: string): boolean =>
  value.endsWith('.mp3') || value.endsWith('.ogg') || value.endsWith('.wav')

export const isAudio = (node: TreeNode): node is AssetNodeItem => isAssetNode(node) && isAudioFile(node.name)

export const isVideoFile = (value: string): boolean => value.endsWith('.mp4')

export const isVideo = (node: TreeNode): node is AssetNodeItem => isAssetNode(node) && isVideoFile(node.name)
