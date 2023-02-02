import { testSubfolder } from './subfolder/subfoldergame'
import { engine, MeshRenderer, Transform } from '@dcl/ecs'

function circularSystem() {
  let t = 0.0
  return (dt: number) => {
    t += 2 * Math.PI * dt

    const group = engine.getEntitiesWith(MeshRenderer)
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
    position: { x, y, z },
    scale: { x: 1, y: 1, z: 1 },
    rotation: { x: 0, y: 0, z: 0, w: 1 }
  })

  MeshRenderer.create(myEntity, {
    mesh: { $case: 'box', box: { uvs: [] } }
  })

  return myEntity
}
createCube(8, 2, 8)

engine.addSystem(circularSystem())

testSubfolder()
