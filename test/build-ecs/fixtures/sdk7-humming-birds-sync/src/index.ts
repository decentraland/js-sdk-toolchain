import {
  Animator,
  AudioSource,
  ColliderLayer,
  engine,
  GltfContainer,
  InputAction,
  pointerEventsSystem,
  Transform
} from '@dcl/sdk/ecs'
import { getUserData } from '~system/UserIdentity'

import { createHummingBird, moveHummingBirds, shootBirds } from './hummingBird'
import { setupUi } from './ui'
import { createMovingPlatforms } from './moving-platforms'
import { cubeSystem, createCube } from './create-cube'
import { SyncEntities } from './sync-enum'

export async function main() {
  const userId = (await getUserData({})).data?.userId ?? ''
  setupUi(userId)
  engine.addSystem(moveHummingBirds)
  createMovingPlatforms()

  engine.addSystem(cubeSystem)
  engine.addSystem(shootBirds(userId))
  createCube(5, 1, 5, true, SyncEntities.CUBE_1)
  // Instantiate base models. Floor & Tree
  const ground = engine.addEntity()
  Transform.create(ground, {
    position: { x: 24, y: 0.1, z: 24 },
    rotation: { x: 0, y: 0, z: 0, w: 0 },
    scale: { x: 4.8, y: 1.6, z: 4.8 }
  })
  GltfContainer.create(ground, {
    src: 'models/Ground.gltf',
    visibleMeshesCollisionMask: ColliderLayer.CL_PHYSICS
  })
  GltfContainer.create(engine.addEntity(), {
    src: 'models/baseLight.glb'
  })
  GltfContainer.create(engine.addEntity(), {
    src: 'models/staticPlatforms.glb'
  })

  const staticPlatform = engine.addEntity()
  Transform.create(staticPlatform, { position: { x: 0, y: 0, z: 20 } })
  GltfContainer.create(staticPlatform, {
    src: 'models/staticPlatforms.glb'
  })

  const tree = engine.addEntity()
  Transform.create(tree, {
    position: { x: 20, y: 0, z: 8 },
    rotation: { x: 0, y: 0, z: 0, w: 0 },
    scale: { x: 1.6, y: 1.6, z: 1.6 }
  })

  GltfContainer.create(tree, {
    src: 'models/Tree.gltf',
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER | ColliderLayer.CL_PHYSICS,
    invisibleMeshesCollisionMask: undefined
  })

  AudioSource.create(tree, {
    audioClipUrl: 'sounds/pickUp.mp3',
    loop: false,
    playing: false
  })

  Animator.create(tree, {
    states: [
      {
        clip: 'Tree_Action',
        loop: false,
        playing: false,
        shouldReset: true
      }
    ]
  })

  pointerEventsSystem.onPointerDown(
    {
      entity: tree,
      opts: {
        button: InputAction.IA_PRIMARY,
        hoverText: 'Shake'
      }
    },
    function () {
      createHummingBird()
      const anim = Animator.getMutable(tree)
      anim.states[0].playing = true
      const audioSource = AudioSource.getMutable(tree)
      audioSource.playing = true
    }
  )
}
