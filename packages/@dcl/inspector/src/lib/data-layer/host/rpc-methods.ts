import { Entity, EntityMappingMode, IEngine, Composite, OnChangeFunction, CompositeDefinition } from '@dcl/ecs'

import { DataLayerRpcServer, FileSystemInterface } from '../types'
import { getFilesInDirectory } from './fs-utils'
import { dumpEngineToComposite, dumpEngineToCrdtCommands } from './utils/engine-to-composite'
import { createFsCompositeProvider } from './utils/fs-composite-provider'
import { stream } from './stream'
import { FileOperation, initUndoRedo } from './undo-redo'
import { minimalComposite } from '../client/feeded-local-fs'
import upsertAsset from './upsert-asset'

export async function initRpcMethods(
  fs: FileSystemInterface,
  engine: IEngine,
  onChanges: OnChangeFunction[]
): Promise<DataLayerRpcServer> {
  // Look for a composite
  const currentCompositeResourcePath = 'main.composite'

  if (!(await fs.existFile(currentCompositeResourcePath))) {
    await fs.writeFile(currentCompositeResourcePath, Buffer.from(JSON.stringify(minimalComposite), 'utf-8'))
  }

  const compositeProvider = await createFsCompositeProvider(fs)
  const mainComposite = compositeProvider.getCompositeOrNull(currentCompositeResourcePath)
  if (mainComposite) {
    Composite.instance(engine, mainComposite, compositeProvider, {
      entityMapping: {
        type: EntityMappingMode.EMM_DIRECT_MAPPING,
        getCompositeEntity: (entity: number | Entity) => entity as Entity
      }
    })
  } else {
    // TODO: log the error
  }

  let dirty = false
  let composite: CompositeDefinition
  const undoRedo = initUndoRedo(fs, engine, () => composite)

  // Create undo/redo container and attach onChange logic.
  onChanges.push(undoRedo.onChange)

  // TODO: review this
  // Dump composite to the FS on every tick
  onChanges.push(() => (dirty = true))
  engine.addSystem(function () {
    if (dirty) {
      dirty = false

      // TODO: hardcoded for the moment
      composite = dumpEngineToComposite(engine, 'json')
      // TODO: the ID should be the selected composite id name
      // composite.id = 'main'

      const mainCrdt = dumpEngineToCrdtCommands(engine)
      fs.writeFile('main.crdt', Buffer.from(mainCrdt)).catch((err) => console.error(`Failed saving main.crdt: `, err))

      compositeProvider
        .save({ src: currentCompositeResourcePath, composite }, 'json')
        .catch((err) => console.error(`Save composite ${currentCompositeResourcePath} fails: `, err))
    }
  }, -1_000_000_000)

  return {
    async redo() {
      const type = await undoRedo.redo()
      return type
    },
    async undo() {
      const type = await undoRedo.undo()
      return type
    },
    /**
     * This method receives an incoming message iterator and returns an async iterable.
     * It adds the undo's operations of the components changed (grouped) on every tick
     */
    crdtStream(iter) {
      return stream(iter, { engine }, () => undoRedo?.addUndoCrdt())
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
      const extensions = ['.glb', '.png', '.composite', '.composite.bin', '.gltf', '.jpg']
      const ignore = ['.git', 'node_modules']

      const files = (await getFilesInDirectory(fs, '', [], true, ignore)).filter((item) => {
        const itemLower = item.toLowerCase()
        return extensions.some((ext) => itemLower.endsWith(ext))
      })

      return { basePath: '.', assets: files.map((item) => ({ path: item })) }
    },
    /**
     * Import asset into the file system.
     * It generates an undo opreation.
     */
    async importAsset(req) {
      const baseFolder = (req.basePath.length ? req.basePath + '/' : '') + req.assetPackageName + '/'
      const undoAcc: FileOperation[] = []
      for (const [fileName, fileContent] of req.content) {
        const filePath = (baseFolder + fileName).replaceAll('//', '/')
        const prevValue = (await fs.existFile(filePath)) ? await fs.readFile(filePath) : null
        undoAcc.push({ prevValue, newValue: fileContent, path: filePath })
        await upsertAsset(fs, filePath, fileContent)
      }
      undoRedo.addUndoFile(undoAcc)
      return {}
    }
  }
}
