import { Entity, EntityMappingMode, IEngine, Composite, OnChangeFunction } from '@dcl/ecs'
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
    Composite.instance(engine, mainComposite, compositeProvider, {
      entityMapping: {
        type: EntityMappingMode.EMM_DIRECT_MAPPING,
        getCompositeEntity: (entity: number | Entity) => entity as Entity
      }
    })
  }

  let dirty = false

  // TODO: remove this mutation.
  // Its hard to follow when you add this onChanges fn and the side-effects
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
    stream(iter) {
      return stream(iter, { engine })
    }
  }
}
