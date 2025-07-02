import { Vector3, TransformNode, Quaternion, Matrix } from '@babylonjs/core'
import { EcsEntity } from '../EcsEntity'

export const TransformUtils = {
  convertToLocalPosition(worldPosition: Vector3, parent: TransformNode | null): Vector3 {
    if (!parent) return worldPosition.clone()
    const worldMatrixInverse = parent.getWorldMatrix().clone().invert()
    return Vector3.TransformCoordinates(worldPosition, worldMatrixInverse)
  },

  convertToLocalRotation(worldRotation: Quaternion, parent: TransformNode | null): Quaternion {
    if (!parent) return worldRotation.clone()
    const parentWorldRotation = parent.rotationQuaternion || Quaternion.FromRotationMatrix(parent.getWorldMatrix())
    return parentWorldRotation.invert().multiply(worldRotation)
  },

  getWorldRotation(entity: EcsEntity): Quaternion {
    if (!entity.rotationQuaternion) return Quaternion.Identity()
    if (!entity.parent || !(entity.parent instanceof TransformNode)) {
      return entity.rotationQuaternion.clone()
    }
    const parentWorldRotation =
      (entity.parent as TransformNode).rotationQuaternion ||
      Quaternion.FromRotationMatrix((entity.parent as TransformNode).getWorldMatrix())
    return parentWorldRotation.multiply(entity.rotationQuaternion)
  },

  getParentWorldScale(parent: TransformNode | null): Vector3 {
    if (!parent) return new Vector3(1, 1, 1)
    const scale = new Vector3()
    const rotation = new Quaternion()
    const position = new Vector3()
    parent.getWorldMatrix().decompose(scale, rotation, position)
    return scale
  }
}
