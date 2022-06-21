const engine = Engine()

function circularSystem() {
  let t = 0.0
  const sdk = engine.baseComponents
  return (dt: number) => {
    t += 2 * Math.PI * dt

    const group = engine.groupOf(sdk.BoxShape)
    for (const [entity] of group) {
      const transform = sdk.Transform.mutable(entity)
      if (transform) {
        transform.position.x = 8 + 2 * Math.cos(t)
        transform.position.z = 8 + 2 * Math.sin(t)
      }
    }
  }
}

function createCube(x: number, y: number, z: number) {
  const sdk = engine.baseComponents
  const myEntity = engine.addEntity()

  sdk.Transform.create(myEntity, {
    position: { x, y, z },
    scale: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0, w: 1 }
  })

  sdk.BoxShape.create(myEntity, {
    withCollisions: true,
    isPointerBlocker: true,
    visible: true,
    uvs: []
  })

  return myEntity
}

createCube(8, 2, 8)
engine.addSystem(circularSystem())
