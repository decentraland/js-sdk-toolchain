function createPlaneTexture(x: number, y: number, z: number): Entity {
  const meshEntity = engine.addEntity()

  Material.create(meshEntity, {
    texture: { src: 'models/polaroid2.png' }
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
  Billboard.create(createPlaneTexture(8, 3, 1), {
    billboardMode: BillboardMode.BM_Y_AXE
  })
  Billboard.create(createPlaneTexture(12, 3, 1))
  createPlaneTexture(4, 3, 1)

  Billboard.create(createPlaneTexture(8, 3, 8), {
    oppositeDirection: true,
    billboardMode: BillboardMode.BM_Y_AXE
  })
  Billboard.create(createPlaneTexture(12, 3, 8), {
    oppositeDirection: true,
    billboardMode: BillboardMode.BM_ALL_AXES
  })
  createPlaneTexture(4, 3, 8)
}

function createTextShape(text: string, position: Vector3.ReadonlyVector3) {
  const entity = engine.addEntity()
  Transform.create(entity, { position })
  return TextShape.create(entity, { text })
}

function createTextShapes() {
  const text1 = createTextShape(
    'Regular, only Y-rotation',
    Vector3.create(8, 1, 1)
  )
  text1.fontSize = 3
  text1.textColor = { r: 1, g: 0.2, b: 0.8, a: 0.8 }
  text1.outlineColor = { r: 0, g: 0, b: 0 }
  text1.outlineWidth = 0.1

  const text2 = createTextShape('Regular', Vector3.create(12, 1, 1))
  text2.fontSize = 3
  text2.textColor = { r: 1, g: 0.2, b: 0.8, a: 0.8 }
  text2.outlineColor = { r: 0, g: 0, b: 0 }
  text2.outlineWidth = 0.1

  const text3 = createTextShape('Without billboard', Vector3.create(4, 1, 1))
  text3.fontSize = 3
  text3.textColor = { r: 1, g: 0.2, b: 0.8, a: 0.8 }
  text3.outlineColor = { r: 0, g: 0, b: 0 }
  text3.outlineWidth = 0.1

  const text4 = createTextShape('Opposite, only Y', Vector3.create(8, 1, 8))
  text4.fontSize = 3
  text4.textColor = { r: 0.8, g: 0.2, b: 1.0, a: 0.8 }
  text4.outlineColor = { r: 0, g: 0, b: 0 }
  text4.outlineWidth = 0.1

  const text5 = createTextShape('Opposite', Vector3.create(12, 1, 8))
  text5.fontSize = 3
  text5.textColor = { r: 0.8, g: 0.2, b: 1.0, a: 0.8 }
  text5.outlineColor = { r: 0, g: 0, b: 0 }
  text5.outlineWidth = 0.1

  const text6 = createTextShape('Without billboard', Vector3.create(4, 1, 8))
  text6.fontSize = 3
  text6.textColor = { r: 0.8, g: 0.2, b: 1.0, a: 0.8 }
  text6.outlineColor = { r: 0, g: 0, b: 0 }
  text6.outlineWidth = 0.1
}

createBillboards()
createTextShapes()

export {}
