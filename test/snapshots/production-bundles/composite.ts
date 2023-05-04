import { engine, MeshRenderer, Transform } from '@dcl/sdk/ecs'

const cube = engine.addEntity()
Transform.create(cube)
MeshRenderer.setBox(cube)
