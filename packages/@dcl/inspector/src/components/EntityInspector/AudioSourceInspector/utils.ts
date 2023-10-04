import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import { isAssetNode } from '../../ProjectAssetExplorer/utils'
import { AssetNodeItem } from '../../ProjectAssetExplorer/types'
import { AssetCatalogResponse } from '../../../tooling-entrypoint'
import { removeBasePath } from '../../../lib/logic/remove-base-path'
import { AudioSourceInput } from './types'
import { PBAudioSource } from '@dcl/ecs'

export const fromAudioSource =
  (base: string) =>
  (value: PBAudioSource): AudioSourceInput => {
    return {
      audioClipUrl: removeBasePath(base, value.audioClipUrl),
      loop: value.loop,
      playing: value.playing
    }
  }

export const toAudioSource =
  (base: string) =>
  (value: AudioSourceInput): PBAudioSource => {
    return {
      audioClipUrl: base ? base + '/' + value.audioClipUrl : value.audioClipUrl,
      loop: value.loop,
      playing: value.playing
    }
  }

export function isValidInput({ basePath, assets }: AssetCatalogResponse, src: string): boolean {
  return !!assets.find(($) => (basePath ? basePath + '/' + src : src) === $.path)
}

export const isAudioFile = (value: string): boolean =>
  value.endsWith('.mp3') || value.endsWith('.ogg') || value.endsWith('.wav')
export const isAudio = (node: TreeNode): node is AssetNodeItem => isAssetNode(node) && isAudioFile(node.name)
