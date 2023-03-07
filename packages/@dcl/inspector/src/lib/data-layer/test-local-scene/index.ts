import { Engine } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { LoadableScene } from '../../babylon/decentraland/SceneContext'
import { createEditorComponents } from '../../sdk/components'

// this was taken verbatim from my deployed world at menduz.dcl.eth
export function getHardcodedLoadableScene(_id: string): LoadableScene {
  return {
    baseUrl: 'https://worlds-content-server.decentraland.org/ipfs/',
    id: 'urn:decentraland:entity:bafkreid44xhavttoz4nznidmyj3rjnrgdza7v6l7kd46xdmleor5lmsxfm',
    entity: {
      version: 'v3',
      type: 'scene' as any,
      pointers: ['0,0', '0,1'],
      timestamp: 1665777069759,
      content: [
        {
          file: 'bin/game.js',
          hash: 'bafkreibyndfz2k2vw7qegxgdhcqb5vlyepcszycpk445snt4cxfqpsvasu'
        },
        {
          file: 'bin/game.js.map',
          hash: 'bafybeigh74j7s6jkl4gwilwu6ftlb2qrhliy4an5l3cxsma6dkg4rp4lse'
        },
        {
          file: 'models/Fish_01.glb',
          hash: 'bafkreigllbmvlnhgdbal5w23rzpvdgpfgw5izytvygc2jz7api7d45xrdy'
        },
        {
          file: 'models/Fish_03.glb',
          hash: 'bafkreichq7bpfxz53kxi2a7vs7goj4nd6mwmg6ov6oh5pcueqyid6j4cwi'
        },
        {
          file: 'models/Fish_04.glb',
          hash: 'bafkreian3us5uykagt57wehzoutjfom2jctj2hsee6eulr36m7dnctmpqa'
        },
        {
          file: 'models/Image_0.png',
          hash: 'bafkreih5kqir5ykts43262cxm755la4s3pjfel7wf5gqacsj4tdpferevi'
        },
        {
          file: 'models/PiratesPack_TX.png.png',
          hash: 'bafkreibtlcu5xu4u7qloyhi6s36e722qu7y7ths2xaspwqgqynpnl5aukq'
        },
        {
          file: 'models/Underwater_floor.glb',
          hash: 'bafybeicyrwyoet7lhcpjedfq3taitm5e2ap6j6nqc3mkgwmbylrlu3qp5y'
        },
        {
          file: 'models/shark.glb',
          hash: 'bafkreigwbedamc5bfsqawkllabrccaftw6hjzxugu7jk4ey2krrnvgjrhy'
        },
        {
          file: 'scene.json',
          hash: 'bafkreievaypmaxhrsg3bts4gjs6fcyrrsltkkuxxcqmuor2sw3og6i7up4'
        }
      ],
      metadata: {
        display: {
          title: 'DCL Scene',
          description: 'My new Decentraland project',
          navmapThumbnail: 'images/scene-thumbnail.png',
          favicon: 'favicon_asset'
        },
        owner: '',
        contact: { name: 'wacaine', email: '' },
        main: 'bin/game.js',
        tags: [],
        scene: { parcels: ['0,0', '0,1'], base: '0,0' },
        spawnPoints: [
          { name: 'spawn1', default: true, position: { x: 0, y: 0, z: 0 }, cameraTarget: { x: 8, y: 1, z: 8 } }
        ],
        requiredPermissions: [],
        featureToggles: {}
      }
    }
  }
}

export function createSameThreadScene() {
  // create engine and its components
  const engine = Engine()
  // const Billboard = components.Billboard(engine)
  const Transform = components.Transform(engine)
  const MeshRenderer = components.MeshRenderer(engine)
  // const GltfContainer = components.GltfContainer(engine)
  // const TextShape = components.TextShape(engine)

  // // My cube generator
  // function createCube(x: number, y: number, z: number) {
  //   // Dynamic entity because we aren't loading static entities out of this scene code
  //   const myEntity = engine.addEntity(true)

  //   Transform.create(myEntity, {
  //     position: { x, y, z }
  //   })

  //   MeshRenderer.setBox(myEntity)

  //   return myEntity
  // }

  function spawnCubes() {
    // const plane = engine.addEntity()
    // MeshRenderer.setPlane(plane)
    // Billboard.create(plane)
    // Transform.create(plane, {
    //   position: { x: -3, y: 6, z: -3 },
    //   scale: { x: 1, y: 1, z: 1 }
    // })

    // const cyllinder = engine.addEntity()
    // MeshRenderer.setCylinder(cyllinder, 0.3, 0.8)
    // Transform.create(cyllinder, {
    //   position: { x: -4, y: 6, z: -4 }
    // })

    // const sphere = engine.addEntity()
    // MeshRenderer.setSphere(sphere)
    // Transform.create(sphere, {
    //   position: { x: -5, y: 6, z: -2 }
    // })
    // {
    //   const glb = engine.addEntity()
    //   GltfContainer.create(glb, { src: 'models/shark.glb' })
    //   Transform.create(glb, {
    //     position: { x: 0, y: 1, z: 0 }
    //   })
    // }
    // {
    //   const glb = engine.addEntity()
    //   GltfContainer.create(glb, { src: 'models/Fish_01.glb' })
    //   Transform.create(glb, {
    //     position: { x: -10, y: 1, z: 5 },
    //     scale: { x: 5, y: 5, z: 5 }
    //   })
    // }
    // const gltf = engine.addEntity()
    // GltfContainer.create(gltf, { src: 'models/Underwater_floor.glb' })
    // Transform.create(gltf, {
    //   position: { x: -10, y: 0, z: -2 }
    // })

    // const sign = engine.addEntity(true)
    // Transform.create(sign, {
    //   position: { x: 8, y: 6, z: 8 }
    // })

    // TextShape.create(sign, {
    //   text: `Stress test SDK v7.0.5\n16x16 cubes`,
    //   fontAutoSize: false,
    //   fontSize: 5,
    //   height: 2,
    //   width: 4,
    //   lineCount: 1,
    //   lineSpacing: 1,
    //   outlineWidth: 0.1,
    //   outlineColor: { r: 0, g: 0, b: 1 },
    //   textColor: { r: 1, g: 0, b: 0, a: 1 },
    //   paddingBottom: 0,
    //   paddingLeft: 0,
    //   paddingRight: 0,
    //   paddingTop: 0,
    //   shadowBlur: 1,
    //   shadowColor: { r: 1, g: 0, b: 0 },
    //   shadowOffsetX: 0,
    //   shadowOffsetY: 5,
    //   textWrapping: false
    // })

    // Billboard.create(sign, {})

    // for (let x = 0.5; x < 4; x += 1) {
    //   for (let y = 0.5; y < 4; y += 1) {
    //     createCube(x, 0, y)
    //   }
    // }

    const { Label } = createEditorComponents(engine)

    const parentA = engine.addEntity()

    Transform.create(parentA, {
      position: { x: 0, y: 0, z: 0 }
    })

    MeshRenderer.setBox(parentA)

    Label.create(parentA, { label: 'Parent A' })

    const parentB = engine.addEntity()

    Transform.create(parentB, {
      position: { x: 2, y: 0, z: 0 }
    })

    MeshRenderer.setBox(parentB)

    Label.create(parentB, { label: 'Parent B' })

    const child = engine.addEntity()

    Transform.create(child, {
      parent: parentA,
      position: { x: 1, y: 1, z: 1 }
    })

    MeshRenderer.setBox(child)

    Label.create(child, { label: 'Child' })

    return parent
  }

  // const entitiesWithBoxShapes = engine.getEntitiesWith(MeshRenderer, Transform)

  // create initial cubes
  spawnCubes()

  // // iterate over the entities of the group to set the initial position
  // for (const [entity] of entitiesWithBoxShapes) {
  //   const transform = Transform.getMutable(entity)

  //   // mutate the rotation
  //   transform.position.y =
  //     Math.cos(Math.sqrt(Math.pow(transform.position.x - 8, 2) + Math.pow(transform.position.z - 8, 2)) / Math.PI) * 2 +
  //     2

  //   transform.scale.x =
  //     transform.scale.y =
  //     transform.scale.z =
  //       Math.sin(Math.sqrt(Math.pow(transform.position.x - 2, 2) + Math.pow(transform.position.z - 8, 2)) / Math.PI) *
  //         0.5 +
  //       0.5

  //   transform.rotation = Quaternion.fromAngleAxis(transform.position.z * 10, Vector3.Up())
  // }

  return engine
}
