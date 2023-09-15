import { engine, Transform, MeshRenderer, Billboard, GltfContainer, Material, TextShape } from '@dcl/sdk/ecs'
import { Color4 } from '@dcl/sdk/math'
export * from '@dcl/sdk'
// My cube generator
function createCube(x: number, y: number, z: number) {
  // Dynamic entity because we aren't loading static entities out of this scene code
  const myEntity = engine.addEntity()

  Transform.create(myEntity, {
    position: { x, y, z }
  })

  MeshRenderer.setBox(myEntity)

  return myEntity
}

function spawnCubes() {
  const plane = engine.addEntity()
  MeshRenderer.setPlane(plane)
  Billboard.create(plane)
  Transform.create(plane, {
    position: { x: -3, y: 6, z: -3 },
    scale: { x: 1, y: 1, z: 1 }
  })

  const cyllinder = engine.addEntity()
  MeshRenderer.setCylinder(cyllinder, 0.3, 0.8)
  Transform.create(cyllinder, {
    position: { x: -4, y: 6, z: -4 }
  })

  const sphere = engine.addEntity()
  MeshRenderer.setSphere(sphere)
  Transform.create(sphere, {
    position: { x: -5, y: 6, z: -2 }
  })
  {
    const glb = engine.addEntity()
    GltfContainer.create(glb, { src: 'models/shark.glb' })
    Transform.create(glb, {
      position: { x: 0, y: 1, z: 0 }
    })
  }
  {
    const glb = engine.addEntity()
    GltfContainer.create(glb, { src: 'models/Fish_01.glb' })
    Transform.create(glb, {
      position: { x: -10, y: 1, z: 5 },
      scale: { x: 5, y: 5, z: 5 }
    })
  }
  const gltf = engine.addEntity()
  GltfContainer.create(gltf, { src: 'models/Underwater_floor.glb' })
  Transform.create(gltf, {
    position: { x: -10, y: 0, z: -2 }
  })

  const sign = engine.addEntity()
  Transform.create(sign, {
    position: { x: 8, y: 6, z: 8 }
  })

  TextShape.create(sign, {
    text: `Stress test SDK v7.0.5\n16x16 cubes`,
    fontAutoSize: false,
    fontSize: 5,
    height: 2,
    width: 4,
    lineCount: 1,
    lineSpacing: 1,
    outlineWidth: 0.1,
    outlineColor: { r: 0, g: 0, b: 1 },
    textColor: { r: 1, g: 0, b: 0, a: 1 },
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    paddingTop: 0,
    shadowBlur: 1,
    shadowColor: { r: 1, g: 0, b: 0 },
    shadowOffsetX: 0,
    shadowOffsetY: 5,
    textWrapping: false
  })

  Billboard.create(sign, {
    billboardMode: 0
  })

  for (let x = 0.5; x < 16; x += 1) {
    // this should be 16, but QuickJS allocator fails to release the memory
    // with that number
    const Y_DIMENSION = 11
    for (let y = 0.5; y < Y_DIMENSION; y += 1) {
      createCube(x, 0, y)
    }
  }
}

let hoverState: number = 0

function CircleHoverSystem(dt: number) {
  hoverState += Math.PI * dt * 0.5

  const entitiesWithBoxShapes = engine.getEntitiesWith(MeshRenderer, Transform)

  // iterate over the entities of the group
  for (const [entity] of entitiesWithBoxShapes) {
    const transform = Transform.getMutable(entity)

    // mutate the rotation
    transform.position.y =
      Math.cos(
        hoverState + Math.sqrt(Math.pow(transform.position.x - 8, 2) + Math.pow(transform.position.z - 8, 2)) / Math.PI
      ) *
        2 +
      2
  }
}

let totalTime: number = 0
let color = true

function MaterialChangerSystem(dt: number) {
  totalTime += dt

  while (totalTime > 1) {
    totalTime -= 1
    color = !color
  }

  const entitiesWithBoxShapes = engine.getEntitiesWith(MeshRenderer, Transform)

  // iterate over the entities of the group
  for (const [entity] of entitiesWithBoxShapes) {
    Material.setPbrMaterial(entity, {
      albedoColor: color ? Color4.Blue() : Color4.Green()
    })
    const { scale } = Transform.getMutable(entity)
    scale.x = scale.y = scale.z = color ? 0.5 : 1
  }
}

spawnCubes()
engine.addSystem(CircleHoverSystem)
engine.addSystem(MaterialChangerSystem)
