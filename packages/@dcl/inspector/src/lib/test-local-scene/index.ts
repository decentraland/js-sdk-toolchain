import { Engine } from '@dcl/ecs'
import { Quaternion, Vector3 } from '@dcl/ecs-math'
import * as components from '@dcl/ecs/dist/components'
import { catalog } from '../../catalog'
import { LoadableScene } from '../babylon/decentraland/SceneContext'
import { createEditorComponents } from '../sdk/components'

// this was taken verbatim from my deployed world at menduz.dcl.eth
export function getHardcodedLoadableScene(_id: string): LoadableScene {
  return {
    baseUrl: 'https://builder-api.decentraland.org/v1/storage/contents/',
    id: 'urn:decentraland:entity:bafkreid44xhavttoz4nznidmyj3rjnrgdza7v6l7kd46xdmleor5lmsxfm',
    entity: {
      version: 'v3',
      type: 'scene' as any,
      pointers: ['0,0', '0,1'],
      timestamp: 1665777069759,
      content: catalog
        .map((assetPack) =>
          assetPack.assets
            .map((asset) => Object.keys(asset.contents).map((file) => ({ file, hash: asset.contents[file] })))
            .reduce((assetPackContents, assetContents) => assetPackContents.concat(assetContents), [])
        )
        .reduce((allContents, assetPackContents) => allContents.concat(assetPackContents), []),
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
  // spawnCubes()

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
