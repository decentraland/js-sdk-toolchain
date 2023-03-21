import { Entity, EntityMappingMode, IEngine, instanceComposite, OnChangeFunction } from '@dcl/ecs'
import { DataLayerRpcServer, FileSystemInterface } from '../types'
import { dumpEngineToComposite } from './engine-to-composite'
import { createFsCompositeProvider } from './fs-composite-provider'
import { stream } from './stream'

export async function initRpcMethods(
  fs: FileSystemInterface,
  engine: IEngine,
  onChanges: OnChangeFunction[]
): Promise<DataLayerRpcServer> {
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

  let dirty = false
  onChanges.push(() => {
    dirty = true
  })

  engine.addSystem(function () {
    if (dirty) {
      dirty = false

      // TODO: hardcoded for the moment
      const composite = dumpEngineToComposite(engine, 'json')
      // TODO: the ID should be the selected composite id name
      composite.id = 'main'

      compositeProvider.save(composite, 'json').catch((err) => console.error(`Save composite fails: `, err))
    }
  }, -1_000_000_000)

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
