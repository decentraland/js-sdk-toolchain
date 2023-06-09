import { Entity, EntityMappingMode, IEngine, Composite, OnChangeFunction, CompositeDefinition } from '@dcl/ecs'

import { DataLayerRpcServer, FileSystemInterface } from '../types'
import { EXTENSIONS, createAssetsFs, getFileName, getFilesInDirectory } from './fs-utils'
import { dumpEngineToComposite, dumpEngineToCrdtCommands } from './utils/engine-to-composite'
import { CompositeManager, createFsCompositeProvider } from './utils/fs-composite-provider'
import { stream } from './stream'
import { FileOperation, initUndoRedo } from './undo-redo'
import { minimalComposite } from '../client/feeded-local-fs'
import upsertAsset from './upsert-asset'
import { initSceneProvider } from './scene'
import { readPreferencesFromFile, serializeInspectorPreferences } from '../../logic/preferences/io'

const INSPECTOR_PREFERENCES_PATH = 'inspector-preferences.json'

function setupEngineDump(
  fs: FileSystemInterface,
  engine: IEngine,
  compositeProvider: CompositeManager,
  compositePath: string
) {
  return function dumpEngineAndGetComposite(dump: boolean = true): CompositeDefinition {
    // TODO: hardcoded for the moment
    const composite = dumpEngineToComposite(engine, 'json')
    // TODO: the ID should be the selected composite id name
    // composite.id = 'main'

    if (!dump) return composite

    const mainCrdt = dumpEngineToCrdtCommands(engine)
    fs.writeFile('main.crdt', Buffer.from(mainCrdt)).catch((err) => console.error('Failed saving main.crdt: ', err))

    compositeProvider
      .save({ src: compositePath, composite }, 'json')
      .catch((err) => console.error(`Save composite ${compositePath} fails: `, err))

    return composite
  }
}

export async function initRpcMethods(
  fs: FileSystemInterface,
  engine: IEngine,
  onChanges: OnChangeFunction[]
): Promise<DataLayerRpcServer> {
  const sceneProvider = await initSceneProvider(fs)
  const assetsFs = createAssetsFs(fs)
  const scenePath = sceneProvider.getScene().display.title

  let inspectorPreferences = await readPreferencesFromFile(fs, INSPECTOR_PREFERENCES_PATH)

  const currentCompositeResourcePath = `${scenePath}/main.composite`

  if (!(await assetsFs.existFile(currentCompositeResourcePath))) {
    await assetsFs.writeFile(currentCompositeResourcePath, Buffer.from(JSON.stringify(minimalComposite), 'utf-8'))
  }

  const compositeProvider = await createFsCompositeProvider(assetsFs)
  const dumpEngineAndGetComposite = setupEngineDump(assetsFs, engine, compositeProvider, currentCompositeResourcePath)
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
  const undoRedo = initUndoRedo(assetsFs, engine, () => composite)

  // Create containers and attach onChange logic.
  onChanges.push(undoRedo.onChange)
  onChanges.push(sceneProvider.onChange)

  // TODO: review this
  // Dump composite to the FS on every tick
  onChanges.push(() => (dirty = true))

  engine.addSystem(() => {
    save(inspectorPreferences.autosaveEnabled)
  }, -1_000_000_000)

  // TODO: review this to avoid this side-effect asignation...
  const save = (dump: boolean = true) => {
    if (dirty) {
      composite = dumpEngineAndGetComposite(dump)
      dirty = false
    }
  }

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
      if (await assetsFs.existFile(req.path)) {
        return {
          data: await assetsFs.readFile(req.path)
        }
      }

      throw new Error("Couldn't find the asset " + req.path)
    },
    async getAssetCatalog() {
      const ignore = ['.git', 'node_modules']

      const files = (await getFilesInDirectory(assetsFs, '', [], true, ignore)).filter((item) => {
        const itemLower = item.toLowerCase()
        return EXTENSIONS.some((ext) => itemLower.endsWith(ext))
      })

      return { basePath: '.', assets: files.map((item) => ({ path: item })) }
    },
    /**
     * Import asset into the file system.
     * It generates an undo operation.
     */
    async importAsset({ assetPackageName, basePath, content }) {
      const baseFolder = basePath.length ? basePath + '/' : ''
      const undoAcc: FileOperation[] = []
      for (const [fileName, fileContent] of content) {
        const ext = fileName.split('.')[1]
        const importName = assetPackageName ? getFileName(assetPackageName, ext) : fileName
        const filePath = (baseFolder + importName).replaceAll('//', '/')
        const prevValue = (await assetsFs.existFile(filePath)) ? await assetsFs.readFile(filePath) : null
        undoAcc.push({ prevValue, newValue: fileContent, path: filePath })
        await upsertAsset(assetsFs, filePath, fileContent)
      }
      undoRedo.addUndoFile(undoAcc)
      return {}
    },
    async removeAsset(req) {
      const filePath = req.path
      // TODO: remove ALL gltf/glb related files...
      if (await assetsFs.existFile(filePath)) {
        const prevValue = await assetsFs.readFile(filePath)
        await assetsFs.rm(filePath)
        undoRedo.addUndoFile([{ prevValue, newValue: null, path: filePath }])
      }
      return {}
    },
    async save() {
      save()
      return {}
    },
    async getInspectorPreferences() {
      return inspectorPreferences
    },
    async setInspectorPreferences(req) {
      inspectorPreferences = req
      await fs.writeFile(INSPECTOR_PREFERENCES_PATH, serializeInspectorPreferences(req))
      return {}
    },
    async getProjectData() {
      const scene = sceneProvider.getScene()
      return {
        path: scene.display.title
      }
    }
  }
}
