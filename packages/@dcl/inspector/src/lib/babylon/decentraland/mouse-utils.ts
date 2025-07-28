import { MeshPredicate, Scene, Vector3 } from '@babylonjs/core'
import future from 'fp-future'

export const LEFT_BUTTON = 0
export const MIDDLE_BUTTON = 1
export const RIGHT_BUTTON = 2

export async function getPointerCoords(scene: Scene, predicate: MeshPredicate = () => true) {
  const coords = future<Vector3>()
  scene.onPointerObservable.addOnce(() => {
    coords.resolve(scene.pick(scene.pointerX, scene.pointerY, predicate).pickedPoint!)
  })
  return coords
}
