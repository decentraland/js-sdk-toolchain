import {
  Entity,
  engine,
  Material,
  Transform,
  MeshRenderer,
  Billboard,
  BillboardMode,
  TextShape,
  Schemas
} from '@dcl/sdk/ecs'
import { Vector3, Color3, Color4 } from '@dcl/sdk/math'

function createPlaneTexture(x: number, y: number, z: number): Entity {
  const meshEntity = engine.addEntity()

  Material.create(meshEntity, {
    material: {
      $case: 'pbr',
      pbr: {
        texture: {
          tex: {
            $case: 'texture',
            texture: { src: 'models/polaroid2.png' }
          }
        }
      }
    }
  })
  Transform.create(meshEntity, {
    position: { x, y, z },
    scale: Vector3.create(2, 2, 2)
  })
  MeshRenderer.create(meshEntity, {
    mesh: {
      $case: 'plane',
      plane: {
        uvs: [...Array.from({ length: 40 }, () => 0), 0, 1, 1, 1, 1, 0, 0, 0]
      }
    }
  })
  return meshEntity
}

function createBillboards() {
  const plane1 = createPlaneTexture(8, 3, 1)
  const plane2 = createPlaneTexture(12, 3, 1)
  createPlaneTexture(4, 3, 1)

  const plane5 = createPlaneTexture(8, 3, 8)
  const plane4 = createPlaneTexture(12, 3, 8)
  createPlaneTexture(4, 3, 8)

  Billboard.create(plane1, {
    billboardMode: BillboardMode.BM_Y
  })
  Billboard.create(plane2)
  Billboard.create(plane4, {
    billboardMode: BillboardMode.BM_ALL
  })
  Billboard.create(plane5, {
    billboardMode: BillboardMode.BM_Y
  })
}

function createTextShape(text: string, position: Vector3, textColor: Color4) {
  const entity = engine.addEntity()
  Transform.create(entity, { position })
  return TextShape.create(entity, {
    text,
    fontSize: 3,
    outlineWidth: 0.1,
    outlineColor: Color3.Black(),
    textColor
  })
}

function createTextShapes() {
  const regularColor = Color4.create(1, 0.2, 0.8, 0.8)
  const oppositeColor = Color4.create(0.8, 0.2, 1, 0.8)

  createTextShape('Regular, only Y-rotation', Vector3.create(8, 1, 1), regularColor)
  createTextShape('Regular', Vector3.create(12, 1, 1), regularColor)
  createTextShape('Without billboard', Vector3.create(4, 1, 1), regularColor)
  createTextShape('Opposite, only Y', Vector3.create(8, 1, 8), oppositeColor)
  createTextShape('Opposite', Vector3.create(12, 1, 8), oppositeColor)
  createTextShape('Without billboard', Vector3.create(4, 1, 8), oppositeColor)
}

createBillboards()
createTextShapes()

const BouncingBillboard = engine.defineComponent('bouncing billboard', {
  t: Schemas.Number,
  originalPosition: Schemas.Vector3
})

engine.addSystem((dt: number) => {
  for (const [entity] of engine.getEntitiesWith(Billboard, Transform)) {
    if (BouncingBillboard.getOrNull(entity) === null) {
      BouncingBillboard.create(entity, {
        originalPosition: Transform.get(entity).position
      })
    }

    const bounce = BouncingBillboard.getMutable(entity)
    bounce.t += dt

    Transform.getMutable(entity).position.y = bounce.originalPosition.y + 0.05 * Math.sin(10 * bounce.t)
  }
})
