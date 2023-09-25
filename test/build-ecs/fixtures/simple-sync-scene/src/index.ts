import { isServer } from '~system/EngineApi'
import { createNetworkManager } from '@dcl/sdk/network-transport'
import { changeColorSystem, createLocalCube, createSyncCube } from './create-cube'
import { engine } from '@dcl/ecs'

export async function main() {
  console.log('Init...')
  createLocalCube(8, 1, 4)
  const server = isServer && !!(await isServer({})).isServer
  const serverUrl = 'ws://127.0.0.1:3000/ws/localScene'

  console.log('Network manager...')
  const networkManager = await createNetworkManager({
    serverUrl,
    networkEntitiesLimit: { serverLimit: 500, clientLimit: 15 }
  })

  if (server) {
    for (const [x, y, z] of [[8, 1, 8]]) {
      console.log('createSyncCube')
      createSyncCube(networkManager, x, y, z)
    }
  } else {
    engine.addSystem(changeColorSystem)
  }

  createLocalCube(12, 1, 12)
}
