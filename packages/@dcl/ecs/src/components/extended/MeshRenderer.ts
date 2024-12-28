import { LastWriteWinElementSetComponentDefinition, Entity, IEngine } from '../../engine'
import { MeshRenderer, PBMeshRenderer } from '../generated/index.gen'

/**
 * @public
 */
export interface MeshRendererComponentDefinitionExtended
  extends LastWriteWinElementSetComponentDefinition<PBMeshRenderer> {
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

  /**
   * @public
   * Set a gltf internal mesh in the MeshRenderer component
   * @param entity - entity to create or replace the MeshRenderer component
   * @param source - the path to the gltf
   * @param meshName - the name of the mesh in the gltf
   */
  setGltfMesh(entity: Entity, source: string, meshName: string): void
}

export function defineMeshRendererComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): MeshRendererComponentDefinitionExtended {
  const theComponent = MeshRenderer(engine)

  return {
    ...theComponent,
    setBox(entity: Entity, uvs?: number[]): void {
      theComponent.createOrReplace(entity, {
        mesh: { $case: 'box', box: { uvs: uvs || [] } }
      })
    },
    setPlane(entity: Entity, uvs?: number[]): void {
      theComponent.createOrReplace(entity, {
        mesh: { $case: 'plane', plane: { uvs: uvs || [] } }
      })
    },
    setCylinder(entity: Entity, radiusBottom: number, radiusTop: number): void {
      theComponent.createOrReplace(entity, {
        mesh: { $case: 'cylinder', cylinder: { radiusBottom, radiusTop } }
      })
    },
    setSphere(entity: Entity): void {
      theComponent.createOrReplace(entity, {
        mesh: { $case: 'sphere', sphere: {} }
      })
    },
    setGltfMesh(entity: Entity, source: string, meshName: string): void {
      theComponent.createOrReplace(entity, {
        mesh: { $case: 'gltf', gltf: { gltfSrc: source, name: meshName } }
      })
    }
  }
}
