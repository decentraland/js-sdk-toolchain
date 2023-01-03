import { engine, Transform, MeshCollider } from '@dcl/sdk/ecs'
export * from '@dcl/sdk'

const cube = engine.addEntity()
Transform.create(cube)

let state = 0
const cubeToBeDeleted = engine.addEntity()
Transform.create(cubeToBeDeleted)

function system() {
  state++
  if (state === 1) {
    engine.removeEntity(cubeToBeDeleted)
  } else if (state === 2) {
    MeshCollider.setBox(engine.addEntity())
  }
}

engine.addSystem(system)
