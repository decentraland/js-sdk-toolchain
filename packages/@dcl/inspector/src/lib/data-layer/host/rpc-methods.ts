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
      async function getFiles(dirPath: string, files: string[], ignore: string[] = []) {
        const currentDirFiles = await fs.readdir(dirPath)
        for (const currentPath of currentDirFiles) {
          if (ignore.includes(currentPath.name)) continue

          const slashIfRequire = (dirPath.length && !dirPath.endsWith('/') && '/') || ''
          const fullPath = dirPath + slashIfRequire + currentPath.name

          if (currentPath.isDirectory) {
            await getFiles(fullPath, files)
          } else {
            files.push(fullPath)
          }
        }
        return files
      }

      const extensions = ['.glb', '.png', '.composite', '.composite.json', '.gltf', '.jpg']
      const ignore = ['.git', 'node_modules']

      const files = (await getFiles('', [], ignore)).filter((item) => {
        const itemLower = item.toLowerCase()
        return extensions.some((ext) => itemLower.endsWith(ext))
      })

      return { basePath: '.', assets: files.map((item) => ({ path: item })) }
    }
  }
}
