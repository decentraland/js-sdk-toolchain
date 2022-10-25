import { PBMeshCollider } from '../generated/pb/decentraland/sdk/components/mesh_collider.gen'

export function buildColliderBox(): PBMeshCollider {
  return {
    mesh: {
      $case: 'box',
      box: {}
    }
  }
}
