import {
  Animator,
  AudioSource,
  ColliderLayer,
  engine,
  GltfContainer,
  InputAction,
  pointerEventsSystem,
  Schemas,
  SyncComponents,
  Transform,
  Tween
} from '@dcl/sdk/ecs'
import { getRealm } from '~system/Runtime'
import { createNetworkManager } from '@dcl/sdk/network-transport'

import { createHummingBird, shootBirds } from './hummingBird'
import { ADMIN_USERS, setupUi } from './ui'
import { isServer } from '~system/EngineApi'
import { getUserData } from '~system/UserIdentity'
import { NetworkManager } from '@dcl/sdk/network-transport/types'
import { createMovingPlatforms } from './moving-platforms'
import { changeColorSystem } from './create-cube'

export const GameStatus = engine.defineComponent('game-status', { paused: Schemas.Boolean })

function gameStatusServer(networkManager: NetworkManager) {
  const gameEntity = networkManager.addEntity(engine)
  GameStatus.create(gameEntity, { paused: false })
  SyncComponents.create(gameEntity, { componentIds: [GameStatus.componentId] })
}

export async function main() {
  const realm = await getRealm({})
  const server = isServer && !!(await isServer({})).isServer
  const serverUrl = realm.realmInfo?.isPreview
    ? 'ws://127.0.0.1:3000/ws/localScene'
    : 'wss://scene-state-server.decentraland.org/ws/boedo.dcl.eth'
  const networkManager = await createNetworkManager({
    serverUrl,
    networkEntitiesLimit: { serverLimit: 500, clientLimit: 15 }
  })
  const userId = (await getUserData({})).data?.userId ?? ''

  setupUi(userId)
  console.log(Tween.componentId)
  if (server) {
    // engine.addSystem(moveHummingBirds)
    // gameStatusServer(networkManager)
    createMovingPlatforms(networkManager)
    // for (const [x, y, z] of [
    //   [44, 1, 26],
    //   [36, 2, 37],
    //   [20, 3, 40],
    //   [19, 1, 23],
    //   [31, 5, 8],
    //   [43, 4, 6],
    //   [37, 3, 24],
    //   [5, 8, 2]
    // ]) {
    //   createCube(networkManager, x, y, z)
    // }
    return
  } else {
    engine.addSystem(changeColorSystem)
    engine.addSystem(shootBirds(userId))
  }

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

  // Instantiate base models
  GltfContainer.create(engine.addEntity(), {
    src: 'models/baseLight.glb'
  })
  GltfContainer.create(engine.addEntity(), {
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
      birdsCreated++
      if (birdsCreated >= 10 && !ADMIN_USERS.has(userId)) return
      createHummingBird(networkManager)
      const anim = Animator.getMutable(tree)
      anim.states[0].playing = true
      const audioSource = AudioSource.getMutable(tree)
      audioSource.playing = true
    }
  )
}
let birdsCreated = 0
