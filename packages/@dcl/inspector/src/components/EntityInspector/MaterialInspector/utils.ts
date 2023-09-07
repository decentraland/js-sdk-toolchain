import { MaterialTransparencyMode, PBMaterial } from '@dcl/ecs'

import { MaterialInput, MaterialType } from './types'
import { mapSelectFieldOptions } from '../SelectField/utils'
import { fromTexture, toTexture } from './Texture/utils'
import { toColor3, toColor4, toHex } from '../ColorField/utils'

const toString = (value: unknown, def: number = 0) => (value ?? def).toString()

export const fromMaterial = (value: PBMaterial): MaterialInput => {
  switch (value.material?.$case) {
    case 'unlit':
      return {
        type: MaterialType.MT_UNLIT,
        alphaTest: String(value.material.unlit.alphaTest ?? 0.5),
        castShadows: !!(value.material.unlit.castShadows ?? true),
        diffuseColor: toHex(value.material.unlit.diffuseColor),
        texture: fromTexture(value.material.unlit.texture ?? {})
      }
    case 'pbr':
    default:
      return {
        type: MaterialType.MT_PBR,
        alphaTest: String(value.material?.pbr.alphaTest ?? 0.5),
        castShadows: !!(value.material?.pbr.castShadows ?? true),
        transparencyMode: toString(value.material?.pbr.transparencyMode, MaterialTransparencyMode.MTM_AUTO),
        metallic: toString(value.material?.pbr.metallic ?? 0.5),
        roughness: toString(value.material?.pbr.roughness ?? 0.5),
        specularIntensity: toString(value.material?.pbr.specularIntensity ?? 1),
        emissiveIntensity: toString(value.material?.pbr.emissiveIntensity ?? 2),
        directIntensity: toString(value.material?.pbr.directIntensity ?? 1),
        albedoColor: toHex(value.material?.pbr.albedoColor),
        emissiveColor: toHex(value.material?.pbr.emissiveColor),
        reflectivityColor: toHex(value.material?.pbr.reflectivityColor),
        texture: fromTexture(value.material?.pbr.texture ?? {}),
        alphaTexture: fromTexture(value.material?.pbr.alphaTexture ?? {}),
        bumpTexture: fromTexture(value.material?.pbr.bumpTexture ?? {}),
        emissiveTexture: fromTexture(value.material?.pbr.emissiveTexture ?? {})
      }
  }
}

export const toMaterial = (value: MaterialInput): PBMaterial => {
  switch (value.type) {
    case MaterialType.MT_UNLIT:
      return {
        material: {
          $case: 'unlit',
          unlit: {
            alphaTest: Number(value.alphaTest ?? 0.5),
            castShadows: !!(value.castShadows ?? true),
            diffuseColor: toColor4(value.diffuseColor),
            texture: toTexture(value.texture)
          }
        }
      }
    case MaterialType.MT_PBR:
    default:
      return {
        material: {
          $case: 'pbr',
          pbr: {
            alphaTest: Number(value.alphaTest ?? 0.5),
            castShadows: !!(value.castShadows ?? true),
            transparencyMode: Number(value.transparencyMode || MaterialTransparencyMode.MTM_AUTO),
            metallic: Number(value.metallic || 0.5),
            roughness: Number(value.roughness || 0.5),
            specularIntensity: Number(value.specularIntensity || 1),
            emissiveIntensity: Number(value.emissiveIntensity || 2),
            directIntensity: Number(value.directIntensity || 1),
            albedoColor: toColor4(value.albedoColor),
            emissiveColor: toColor3(value.emissiveColor),
            reflectivityColor: toColor3(value.reflectivityColor),
            texture: toTexture(value.texture),
            alphaTexture: toTexture(value.alphaTexture),
            bumpTexture: toTexture(value.bumpTexture),
            emissiveTexture: toTexture(value.emissiveTexture)
          }
        }
      }
  }
}

export function isValidInput(): boolean {
  return true
}

export const MATERIAL_TYPES = mapSelectFieldOptions(MaterialType)

export const TRANSPARENCY_MODES = [{
  value: 0,
  label: 'Opaque'
}, {
  value: 1,
  label: 'Alpha test'
}, {
  value: 2,
  label: 'Alpha blend'
}, {
  value: 3,
  label: 'Alpha test & blend'
}, {
  value: 4,
  label: 'Auto'
}]
