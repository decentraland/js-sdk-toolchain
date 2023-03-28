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
    async *crdtStream(iter) {
      // TODO: check this types, in the meantime, the lines below do the same
      // return stream(iter, { engine })

      const gen = stream(iter, { engine })
      for await (const it of gen) {
        yield it
      }
    },
    async getAssetData(req) {
      if (await fs.existFile(req.path)) {
        return {
          data: await fs.readFile(req.path)
        }
      }

      throw new Error("Couldn't find the asset " + req.path)
    },
    async getAssetCatalog() {
      async function getFiles(dirPath: string, files: string[]) {
        // debugger
        const currentDirFiles = await fs.readdir(dirPath)
        for (const currentPath of currentDirFiles) {
          const fullPath = dirPath + (dirPath.endsWith('/') ? '' : '/') + currentPath.name
          if (currentPath.isDirectory) {
            await getFiles(fullPath, files)
          } else {
            files.push(fullPath)
          }
        }
        return files
      }
      const files = await getFiles('./', [])

      return { basePath: '.', assets: files.map((item) => ({ path: item })) }
    }
  }
}
