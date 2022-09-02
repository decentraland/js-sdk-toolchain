function circularSystem() {
  let t = 0.0
  return (dt: number) => {
    t += 2 * Math.PI * dt

    const group = engine.getEntitiesWith(BoxShape)
    for (const [entity] of group) {
      const transform = Transform.getMutableOrNull(entity)
      if (transform) {
        transform.position.x = 8 + 2 * Math.cos(t)
        transform.position.z = 8 + 2 * Math.sin(t)
      }
    }
  }
}

function createCube(x: number, y: number, z: number) {
  const myEntity = engine.addEntity()

  Transform.create(myEntity, {
    position: { x, y, z }
  })

  BoxShape.create(myEntity, {
    withCollisions: true,
    isPointerBlocker: true,
    visible: true,
    uvs: []
  })

  return myEntity
}
createCube(8, 2, 8)
engine.addSystem(circularSystem())

engine.renderUI(ui)
