import { AbstractMesh } from '@babylonjs/core'
import { GridMaterial } from '@babylonjs/materials'
import { memoize } from '../../logic/once'
import * as BABYLON from '@babylonjs/core'

const colliderSymbol = Symbol('isCollider')

export const colliderMaterial = memoize((scene: BABYLON.Scene) => {
  const ret = new GridMaterial('collider-material', scene)

  ret.opacity = 0.99
  ret.sideOrientation = 0
  ret.zOffset = -1
  ret.fogEnabled = false

  return ret
})

export function markAsCollider(mesh: AbstractMesh) {
  ;(mesh as any)[colliderSymbol] = true
  mesh.material = colliderMaterial(mesh.getScene())
}

export function isCollider(mesh: AbstractMesh) {
  return !!(mesh as any)[colliderSymbol]
}
