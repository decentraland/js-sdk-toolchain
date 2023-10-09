import { PBAudioSource } from '@dcl/ecs'
import { removeBasePath } from '../../../lib/logic/remove-base-path'
import { AssetCatalogResponse } from '../../../tooling-entrypoint'
import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import { isAssetNode } from '../../ProjectAssetExplorer/utils'
import { AssetNodeItem } from '../../ProjectAssetExplorer/types'
import { AudioSourceInput } from './types'

export const fromAudioSource =
  (base: string) =>
  (value: PBAudioSource): AudioSourceInput => {
    return {
      audioClipUrl: removeBasePath(base, value.audioClipUrl),
      loop: value.loop,
      playing: value.playing,
      volume: volumeFromAudioSource(value.volume)
    }
  }

export const toAudioSource =
  (base: string) =>
  (value: AudioSourceInput): PBAudioSource => {
    return {
      audioClipUrl: base ? base + '/' + value.audioClipUrl : value.audioClipUrl,
      loop: value.loop,
      playing: value.playing,
      volume: volumeToAudioSource(value.volume)
    }
  }

export function volumeFromAudioSource(volume: number | undefined): string {
  const value = (volume ?? 1.0) * 100
  return parseInt(value.toFixed(2)).toString()
}

export function volumeToAudioSource(volume: string | undefined): number {
  const value = parseFloat(volume ?? '0')
  return parseFloat((value / 100).toFixed(2))
}

export function isValidInput({ basePath, assets }: AssetCatalogResponse, src: string): boolean {
  return !!assets.find(($) => (basePath ? basePath + '/' + src : src) === $.path)
}

export const isAudioFile = (value: string): boolean =>
  value.endsWith('.mp3') || value.endsWith('.ogg') || value.endsWith('.wav')
export const isAudio = (node: TreeNode): node is AssetNodeItem => isAssetNode(node) && isAudioFile(node.name)

export function isValidVolume(volume: string | undefined): boolean {
  const value = (volume ?? 0).toString()
  return !isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 100
}
