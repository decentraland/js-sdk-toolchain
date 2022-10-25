import { PBMeshRenderer } from '../generated/pb/decentraland/sdk/components/mesh_renderer.gen'

export function buildBox(uvs: number[] = []): PBMeshRenderer {
  return {
    mesh: {
      $case: 'box',
      box: {
        uvs
      }
    }
  }
}
