export type BaseAsset = {
  blob: File
  name: string
  extension: string
  error?: ValidationError
  thumbnail?: string
  isEmote?: boolean
}

export type ModelAsset = BaseAsset & {
  gltf: Gltf
  buffers: BaseAsset[]
  images: BaseAsset[]
}

export type Asset = ModelAsset | BaseAsset

export type ValidationError =
  | {
      type: 'size' | 'type' | 'name' | 'model'
      message: string
    }
  | undefined

export type AssetType = 'Models' | 'Images' | 'Audio' | 'Video' | 'Other'

export const isModelAsset = (asset: Asset): asset is ModelAsset => {
  const _asset = asset as any
  return _asset.buffers && _asset.images
}

export interface Gltf {
  mimeType: string
  validatorVersion: string
  validatedAt: Date
  issues: GltfIssues
  info: GltfInfo
}

export interface GltfInfo {
  version: string
  generator: string
  resources: GltfResource[]
  animationCount: number
  materialCount: number
  hasMorphTargets: boolean
  hasSkins: boolean
  hasTextures: boolean
  hasDefaultScene: boolean
  drawCallCount: number
  totalVertexCount: number
  totalTriangleCount: number
  maxUVs: number
  maxInfluences: number
  maxAttributes: number
}

export interface GltfResource {
  pointer: string
  mimeType: string
  storage: string
  uri: string
  byteLength?: number
  image?: GltfImage
}

export interface GltfImage {
  width: number
  height: number
  format: string
  primaries: string
  transfer: string
  bits: number
}

export interface GltfIssues {
  numErrors: number
  numWarnings: number
  numInfos: number
  numHints: number
  messages: GltfMessage[]
  truncated: boolean
}

/*
  Severity codes are Error (0), Warning (1), Information (2), Hint (3).
  https://github.com/KhronosGroup/glTF-Validator/blob/main/lib/src/errors.dart
*/
export interface GltfMessage {
  code: string
  message: string
  severity: number
  pointer: string
}
