import { PreEngine } from '../../engine'
import { ComponentType } from '../../engine/component'
import { Entity } from '../../engine/entity'
import { ISchema } from '../../engine/types'
import * as MeshRendererSchema from '../generated/MeshRenderer.gen'
import {
  PBMeshRenderer,
  PBMeshRenderer_CylinderMesh,
  PBMeshRenderer_SphereMesh
} from '../generated/pb/decentraland/sdk/components/mesh_renderer.gen'

export interface WrappedMeshRenderer {
  box?: undefined | { uvs?: number[] }
  sphere?: PBMeshRenderer_SphereMesh | undefined
  cylinder?: PBMeshRenderer_CylinderMesh | undefined
  plane?: undefined | { uvs?: number[] }
}

export default function wrapMeshRenderer(engine: PreEngine) {
  type ConstructorType = WrappedMeshRenderer
  type T = ISchema<PBMeshRenderer>

  const MeshRenderer = engine.defineComponentFromSchema<
    ISchema<PBMeshRenderer>,
    WrappedMeshRenderer
  >(MeshRendererSchema.MeshRendererSchema, MeshRendererSchema.COMPONENT_ID)

  return {
    ...MeshRenderer,
    create(entity: Entity, val?: ConstructorType): ComponentType<T> {
      if (val?.box && !val.box.uvs) {
        val.box.uvs = []
      }
      if (val?.plane && !val.plane.uvs) {
        val.plane.uvs = []
      }
      return MeshRenderer.create(entity, val)
    },
    createOrReplace(entity: Entity, val?: ConstructorType): ComponentType<T> {
      if (val?.box && !val.box.uvs) {
        val.box.uvs = []
      }
      if (val?.plane && !val.plane.uvs) {
        val.plane.uvs = []
      }
      return MeshRenderer.createOrReplace(entity, val)
    }
  }
}
