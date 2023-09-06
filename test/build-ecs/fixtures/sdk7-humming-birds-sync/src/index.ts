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
import { getRealm } from '~system/Runtime'
import { createNetworkTransport } from '@dcl/sdk/network-transport'

import { createHummingBird, moveHummingBirds, shootBirds } from './hummingBird'
import { setupUi } from './ui'
import { isServer } from '~system/EngineApi'
import userIdentity from '~system/UserIdentity'

export async function main() {
  const realm = await getRealm({})
  const server = isServer && !!(await isServer({})).isServer
  const serverUrl = realm.realmInfo?.isPreview
    ? 'ws://127.0.0.1:3000/ws/localScene'
    : 'wss://scene-state-server.decentraland.org/ws/boedo.dcl.eth'
  const networkEntityFactory = await createNetworkTransport(serverUrl)

  setupUi()

  if (server) {
    engine.addSystem(moveHummingBirds)
  } else {
    const userId = (userIdentity?.getUserData && (await userIdentity.getUserData({})).data?.userId) || ''
    engine.addSystem(shootBirds('userId'))
  }

  const ground = engine.addEntity()

  Transform.create(ground, {
    position: { x: 8, y: 0, z: 8 },
    rotation: { x: 0, y: 0, z: 0, w: 0 },
    scale: { x: 1.6, y: 1.6, z: 1.6 }
  })

  GltfContainer.create(ground, {
    src: 'models/Ground.gltf'
  })

  const tree = engine.addEntity()
  Transform.create(tree, {
    position: { x: 8, y: 0, z: 8 },
    rotation: { x: 0, y: 0, z: 0, w: 0 },
    scale: { x: 1.6, y: 1.6, z: 1.6 }
  })
  GltfContainer.create(tree, {
    src: 'models/Tree.gltf',
    visibleMeshesCollisionMask: ColliderLayer.CL_POINTER,
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
        shouldReset: true,
        name: 'Tree_Action'
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
      createHummingBird(networkEntityFactory)
      const anim = Animator.getMutable(tree)
      anim.states[0].playing = true
      const audioSource = AudioSource.getMutable(tree)
      audioSource.playing = true
    }
  )
}
