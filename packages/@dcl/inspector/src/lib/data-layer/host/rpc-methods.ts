import { Entity, EntityMappingMode, IEngine, Composite, OnChangeFunction, CompositeDefinition } from '@dcl/ecs'

import { DataLayerRpcServer, FileSystemInterface } from '../types'
import { getFilesInDirectory } from './fs-utils'
import { dumpEngineToComposite } from './utils/engine-to-composite'
import { createFsCompositeProvider } from './utils/fs-composite-provider'
import { stream } from './stream'
import { initUndoRedo } from './undo-redo'

export async function initRpcMethods(
  fs: FileSystemInterface,
  engine: IEngine,
  onChanges: OnChangeFunction[]
): Promise<DataLayerRpcServer> {
  // Look for a composite
  const compositeProvider = await createFsCompositeProvider(fs)
  const mainComposite = compositeProvider.getCompositeOrNull('main.composite.json')

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

  let composite: CompositeDefinition
  let undoRedo: ReturnType<typeof initUndoRedo>

  engine.addSystem(function () {
    if (dirty) {
      dirty = false

      // TODO: hardcoded for the moment
      const _composite = dumpEngineToComposite(engine, 'json')
      // TODO: the ID should be the selected composite id name
      // composite.id = 'main'

      // TODO: TBD 🫠
      if (!undoRedo) {
        undoRedo = initUndoRedo(engine, () => composite)
        onChanges.push(undoRedo.onChange)
      }

      // compositeProvider.save(composite, 'json').catch((err) => console.error(`Save composite fails: `, err))
    }
  }, -1_000_000_000)

  return {
    async redo() {
      console.log('redo')
      await undoRedo.redo()
      return {}
    },
    async undo() {
      console.log('undo')
      await undoRedo.undo()
      return {}
    },
    // This method receives an incoming message iterator
    // and returns an async iterable. consumption and production of messages
    // are decoupled operations
    crdtStream(iter) {
      return stream(iter, { engine })
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
      const extensions = ['.glb', '.png', '.composite', '.composite.json', '.gltf', '.jpg']
      const ignore = ['.git', 'node_modules']

      const files = (await getFilesInDirectory(fs, '', [], true, ignore)).filter((item) => {
        const itemLower = item.toLowerCase()
        return extensions.some((ext) => itemLower.endsWith(ext))
      })

      return { basePath: '.', assets: files.map((item) => ({ path: item })) }
    },

    async importAsset(req) {
      const baseFolder = (req.basePath.length ? req.basePath + '/' : '') + req.assetPackageName + '/'

      for (const [fileName, fileContent] of req.content) {
        const filePath = (baseFolder + fileName).replaceAll('//', '/')
        await fs.writeFile(filePath, Buffer.from(fileContent))
      }

      return {}
    }
  }
}
