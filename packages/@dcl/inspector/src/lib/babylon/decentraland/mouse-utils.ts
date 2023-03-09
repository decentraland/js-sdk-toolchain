import { Scene, Vector3 } from '@babylonjs/core'
import future from 'fp-future'

export async function getPointerCoords(scene: Scene) {
  const coords = future<Vector3>()
  scene.onPointerObservable.addOnce(() => {
    coords.resolve(scene.pick(scene.pointerX, scene.pointerY).pickedPoint!)
  })
  return coords
}
