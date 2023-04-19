import { PBGltfContainer } from '@dcl/ecs'

import { AssetCatalogResponse } from '../../../tooling-entrypoint'

export function fromGltf(value: PBGltfContainer) {
  return { src: value.src }
}

export const toGltf = fromGltf

export function isValidInput({ assets }: AssetCatalogResponse, src: string): boolean {
  return !!assets.find(($) => $.path === src)
}
