function createCube(x: number, y: number, z: number): Entity {
  const meshEntity = engine.addEntity()

  Material.create(meshEntity, {
    texture: { src: 'models/polaroid2.png' }
  })
  Transform.create(meshEntity, {
    position: { x, y, z },
    scale: Vector3.create(2, 2, 2)
  })
  MeshRenderer.create(meshEntity, {
    plane: {
      uvs: [...Array.from({ length: 40 }, () => 0), 0, 1, 1, 1, 1, 0, 0, 0]
    }
  })
  return meshEntity
}

Billboard.create(createCube(8, 3, 2), {
  billboardMode: BillboardMode.YAxe
})
Billboard.create(createCube(12, 3, 2))
createCube(4, 3, 2)

Billboard.create(createCube(8, 3, 8), {
  oppositeDirection: true,
  billboardMode: BillboardMode.YAxe
})
Billboard.create(createCube(12, 3, 8), {
  oppositeDirection: true,
  billboardMode: BillboardMode.AllAxes
})
createCube(4, 3, 8)

export {}
