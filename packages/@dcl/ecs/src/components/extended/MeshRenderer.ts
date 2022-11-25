import { ComponentDefinition, Entity, IEngine, ISchema } from '../../engine'
import { PBMeshRenderer } from '../generated/index.gen'
import * as MeshRendererSchema from './../generated/MeshRenderer.gen'

/**
 * @public
 */
export type MeshRendererComponentDefinition = ComponentDefinition<
  ISchema<PBMeshRenderer>,
  PBMeshRenderer
>
/**
 * @public
 */
export interface MeshRendererComponentDefinitionExtended
  extends MeshRendererComponentDefinition {
  /**
   * @public
   * Set a box in the MeshRenderer component
   * @param entity - entity to create or replace the MeshRenderer component
   * @param uvs - uvs coord
   */
  setBox(entity: Entity, uvs?: number[]): void

  /**
   * @public
   * Set a plane in the MeshRenderer component
   * @param entity - entity to create or replace the MeshRenderer component
   * @param uvs - uvs coord
   */
  setPlane(entity: Entity, uvs?: number[]): void

  /**
   * @public
   * Set a cylinder in the MeshRenderer component
   * @param entity - entity to create or replace the MeshRenderer component
   * @param radiusBottom -
   * @param radiusTop -
   */
  setCylinder(entity: Entity, radiusBottom?: number, radiusTop?: number): void

  /**
   * @public
   * Set a sphere in the MeshRenderer component
   * @param entity - entity to create or replace the MeshRenderer component
   */
  setSphere(entity: Entity): void
}

export function defineMeshRendererComponent(
  engine: Pick<IEngine, 'getComponent'>
): MeshRendererComponentDefinitionExtended {
  const MeshRenderer = engine.getComponent<
    typeof MeshRendererSchema.MeshRendererSchema
  >(MeshRendererSchema.COMPONENT_ID)

  return {
    ...MeshRenderer,
    setBox(entity: Entity, uvs?: number[]): void {
      MeshRenderer.createOrReplace(entity, {
        mesh: { $case: 'box', box: { uvs: uvs || [] } }
      })
    },
    setPlane(entity: Entity, uvs?: number[]): void {
      MeshRenderer.createOrReplace(entity, {
        mesh: { $case: 'plane', plane: { uvs: uvs || [] } }
      })
    },
    setCylinder(entity: Entity, radiusBottom: number, radiusTop: number): void {
      MeshRenderer.createOrReplace(entity, {
        mesh: { $case: 'cylinder', cylinder: { radiusBottom, radiusTop } }
      })
    },
    setSphere(entity: Entity): void {
      MeshRenderer.createOrReplace(entity, {
        mesh: { $case: 'sphere', sphere: {} }
      })
    }
  }
}
