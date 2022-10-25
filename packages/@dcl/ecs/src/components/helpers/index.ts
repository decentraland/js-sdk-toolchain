import { buildColliderBox } from './MeshCollider'
import { buildBox } from './MeshRenderer'

export namespace Helper {
  export const MeshRenderer = { buildBox }
  export const MeshCollider = { buildBox: buildColliderBox }
}
