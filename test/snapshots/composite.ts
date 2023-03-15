import { engine, MeshRenderer, Transform } from '@dcl/sdk/ecs'
export * from '@dcl/sdk/with-composite'

const cube = engine.addEntity()
Transform.create(cube)
MeshRenderer.setBox(cube)
