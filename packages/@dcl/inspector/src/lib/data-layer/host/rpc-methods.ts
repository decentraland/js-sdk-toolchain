import { IEngine } from '@dcl/ecs'
import { DataLayerRpcServer, FileSystemInterface } from '../types'
import { stream } from './stream'

import {
  Composite,
  compositeFromBinary,
  compositeFromJson,
  CompositeProvider,
  Entity,
  EntityMappingMode,
  instanceComposite
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

export async function initRpcMethods(fs: FileSystemInterface, engine: IEngine): Promise<DataLayerRpcServer> {
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

  return {
    async redo() {
      return {}
    },
    async undo() {
      return {}
    },
    // This method receives an incoming message iterator
    // and returns an async iterable. consumption and production of messages
    // are decoupled operations
    async *stream(iter) {
      // TODO: check this types, in the meantime, the lines below do the same
      // return stream(iter, { engine })

      const gen = stream(iter, { engine })
      for await (const it of gen) {
        yield it
      }
    }
  }
}
