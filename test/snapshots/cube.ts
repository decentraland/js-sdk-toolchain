import { engine, Transform } from '@dcl/sdk/ecs'
export * from '@dcl/sdk'

const cube = engine.addEntity()
Transform.create(cube)
