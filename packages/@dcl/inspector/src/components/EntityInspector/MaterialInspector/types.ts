import { Entity } from '@dcl/ecs'
import { TextureInput } from './Texture/types'

export interface Props {
  entity: Entity
}

export enum MaterialType {
  MT_UNLIT = 'unlit',
  MT_PBR = 'pbr'
}

export enum TextureType {
  TT_TEXTURE = 'texture',
  TT_ALPHA_TEXTURE = 'alphaTexture',
  TT_BUMP_TEXTURE = 'bumpTexture',
  TT_EMISSIVE_TEXTURE = 'emissiveTexture'
}

export type MaterialInput = {
  type: MaterialType
  alphaTest?: string
  castShadows?: boolean
  diffuseColor?: string
  texture?: TextureInput
  alphaTexture?: TextureInput
  emissiveTexture?: TextureInput
  bumpTexture?: TextureInput
  transparencyMode?: string
  metallic?: string
  roughness?: string
  specularIntensity?: string
  emissiveIntensity?: string
  directIntensity?: string
  albedoColor?: string
  emissiveColor?: string
  reflectivityColor?: string
}
