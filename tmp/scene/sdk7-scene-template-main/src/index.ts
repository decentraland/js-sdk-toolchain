import {
  engine, executeTask, Material
} from '@dcl/sdk/ecs'
import { Color3 } from '@dcl/sdk/math'

import { createCube } from './factory'
import { bounceScalingSystem, circularSystem, spawnerSystem } from './systems'

import { setupUi } from './ui'

// export all the functions required to make the scene work
export * from '@dcl/sdk'

// Defining behavior. See `src/systems.ts` file.
engine.addSystem(circularSystem)
engine.addSystem(spawnerSystem)
engine.addSystem(bounceScalingSystem)

// Initial function executed when scene is evaluated and after systems are created
executeTask(async function () {
  // Create my main cube and color it.
  const cube = createCube(8, 1, 8)
  Material.setPbrMaterial(cube, { albedoColor: Color3.fromHexString('#FFD96C') })
})

setupUi()