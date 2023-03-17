import { createEngine } from '../host/engine'
import { DataLayerRpcClient, DataLayerRpcServer, FileSystemInterface } from '../types'
import { initRpcMethods } from '../host/rpc-methods'
import {
  Composite,
  compositeFromBinary,
  compositeFromJson,
  CompositeProvider,
  instanceComposite,
  Entity,
  EntityMappingMode
} from '@dcl/ecs'

export async function createFsCompositeProvider(fs: FileSystemInterface): Promise<CompositeProvider> {
  const compositePaths = (await fs.getDirectoryFiles('')).filter(
    (item) => item.endsWith('.composite.json') || item.endsWith('.composite')
  )

  const compositePromises = compositePaths.map(async (itemPath) => {
    try {
      if (itemPath.endsWith('.json')) {
        const compositeContent = await fs.readFile<string>(itemPath, 'string')
        const json = JSON.parse(compositeContent)
        const composite = compositeFromJson(json)
        return composite
      } else {
        const compositeContent = await fs.readFile<Uint8Array>(itemPath, 'uint8array')
        const composite = compositeFromBinary(compositeContent)
        return composite
      }
    } catch (err) {
      console.error(`Error loading composite ${itemPath}: ${(err as any).toString()}`)
      return null
    }
  })

  const composites = (await Promise.all(compositePromises)).filter((item) => !!item) as Composite[]

  return {
    getCompositeOrNull(id: string) {
      return composites.find((item) => item.id === id) || null
    }
  }
}

function wrapRpcClientFromRpcServer(server: DataLayerRpcServer): DataLayerRpcClient {
  return server as any as DataLayerRpcClient
}

/**
 * This RpcClient creates internally the server, implementing its own file system interface and engine.
 * @param fs
 * @returns
 */
export async function createLocalDataLayerRpcClient(fs: FileSystemInterface): Promise<DataLayerRpcClient> {
  const engine = createEngine()

  // Look for a composite
  const compositeProvider = await createFsCompositeProvider(fs)
  const mainComposite = compositeProvider.getCompositeOrNull('main')

  if (mainComposite) {
    instanceComposite(engine, mainComposite, compositeProvider, {
      entityMapping: {
        type: EntityMappingMode.EMM_DIRECT_MAPPING,
        getCompositeEntity: (entity: number | Entity) => entity as Entity
      }
    })
  }

  // the server (datalayer) should also keep its internal "game loop" to process
  // all the incoming messages. we have this interval easy solution to mock that
  // game loop for the time being.
  // since the servers DO NOT run any game system, the only thing it does is to
  // process incoming and outgoing messages + dirty states
  setInterval(() => {
    engine.update(0.016).catch(($) => {
      console.error($)
      debugger
    })
  }, 16)

  return wrapRpcClientFromRpcServer(initRpcMethods(fs, engine))
}
