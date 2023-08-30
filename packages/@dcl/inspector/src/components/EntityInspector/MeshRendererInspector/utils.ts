import { PBMeshCollider } from '@dcl/ecs'
import { MeshRendererInput, MeshType } from './types'
import { mapSelectFieldOptions } from '../SelectField/utils'

export const fromMeshRenderer = (value: PBMeshCollider): MeshRendererInput => {
  // uvs are not typed for box/plane
  // TODO: add types for them in @dcl/ecs
  switch(value.mesh?.$case) {
    case 'sphere':
      return { mesh: MeshType.MT_SPHERE }
    case 'cylinder':
      return {
        mesh: MeshType.MT_CYLINDER,
        radiusTop: String(value.mesh.cylinder.radiusTop ?? 0.5),
        radiusBottom: String(value.mesh.cylinder.radiusBottom ?? 0.5)
      }
    case 'plane':
      return { mesh: MeshType.MT_PLANE, uvs: getUvs(value.mesh.plane).join(' ') }
    case 'box':
    default:
      return { mesh: MeshType.MT_BOX, uvs: getUvs(value.mesh?.box).join(' ') }
  }
}

export const toMeshRenderer = (value: MeshRendererInput): PBMeshCollider => {
  switch(value.mesh) {
    case MeshType.MT_SPHERE:
      return { mesh: { $case: MeshType.MT_SPHERE, sphere: {} } }
    case MeshType.MT_CYLINDER:
      return {
        mesh: {
          $case: MeshType.MT_CYLINDER,
          cylinder: {
            radiusTop: Number(value.radiusTop ?? 0.5),
            radiusBottom: Number(value.radiusBottom ?? 0.5)
          }
        }
      }
    case MeshType.MT_PLANE:
      return { mesh: { $case: MeshType.MT_PLANE, plane: { uvs: (value.uvs ?? '').split(' ') } } }
    case MeshType.MT_BOX:
    default:
      return { mesh: { $case: MeshType.MT_BOX, box: { uvs: (value.uvs ?? '').split(' ') } } }
  }
}

export function isValidInput(): boolean {
  return true
}

export const SHAPES = mapSelectFieldOptions(MeshType)

function getUvs(value?: {} & { uvs?: string[] }) {
  return value?.uvs || []
}

export function hasUvs(value: unknown) {
  return typeof value === 'string' && (value === MeshType.MT_PLANE || value === MeshType.MT_BOX)
}
