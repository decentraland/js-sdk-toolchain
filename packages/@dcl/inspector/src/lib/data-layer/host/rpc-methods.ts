import { IEngine, OnChangeFunction } from '@dcl/ecs'

import { DataLayerRpcServer, FileSystemInterface } from '../types'
import { DIRECTORY, EXTENSIONS, getCurrentCompositePath, getFilesInDirectory, withAssetDir } from './fs-utils'
import { stream } from './stream'
import { FileOperation, initUndoRedo } from './undo-redo'
import upsertAsset from './upsert-asset'
import { initSceneProvider } from './scene'
import { readPreferencesFromFile, serializeInspectorPreferences } from '../../logic/preferences/io'
import { removeLegacyEntityNodeComponents } from './utils/legacy-entity-node'
import { compositeAndDirty } from './utils/composite-dirty'

const INSPECTOR_PREFERENCES_PATH = 'inspector-preferences.json'

export async function initRpcMethods(
  fs: FileSystemInterface,
  engine: IEngine,
  onChanges: OnChangeFunction[]
): Promise<DataLayerRpcServer> {
  const sceneProvider = await initSceneProvider(fs)
  const currentCompositeResourcePath = getCurrentCompositePath()
  let inspectorPreferences = await readPreferencesFromFile(fs, INSPECTOR_PREFERENCES_PATH)

  // Handle old EntityNode components
  removeLegacyEntityNodeComponents(engine)

  const compositeManager = await compositeAndDirty(
    fs,
    engine,
    () => {
      return inspectorPreferences
    },
    currentCompositeResourcePath
  )
  const undoRedoManager = initUndoRedo(fs, engine, () => compositeManager.composite)

  // Create containers and attach onChange logic.
  onChanges.push(undoRedoManager.onChange)

  // Scene Component logic
  onChanges.push(sceneProvider.onChange)

  // Dirty Save Logic
  onChanges.push(compositeManager.onChange)

  return {
    async redo() {
      const type = await undoRedoManager.redo()
      return type
    },
    async undo() {
      const type = await undoRedoManager.undo()
      return type
    },
    /**
     * This method receives an incoming message iterator and returns an async iterable.
     * It adds the undo's operations of the components changed (grouped) on every tick
     */
    crdtStream(iter) {
      return stream(iter, { engine }, () => undoRedoManager?.addUndoCrdt())
    },
    async getAssetData(req) {
      if (!req.path) throw new Error('Invalid path')
      if (await fs.existFile(req.path)) {
        return {
          data: await fs.readFile(req.path)
        }
      }

      throw new Error(`Couldn't find the asset ${req.path}`)
    },
    async getAssetCatalog() {
      const ignore = ['.git', 'node_modules']
      const basePath = withAssetDir()

      const files = (await getFilesInDirectory(fs, basePath, [], true, ignore)).filter((item) => {
        const itemLower = item.toLowerCase()
        return EXTENSIONS.some((ext) => itemLower.endsWith(ext))
      })

      return { basePath, assets: files.map(($) => ({ path: $ })) }
    },
    /**
     * Import asset into the file system.
     * It generates an undo operation.
     */
    async importAsset({ assetPackageName, basePath, content }) {
      const baseFolder = basePath.length ? basePath + '/' : ''
      const undoAcc: FileOperation[] = []
      for (const [fileName, fileContent] of content) {
        const importName = assetPackageName ? `${assetPackageName}/${fileName}` : fileName
        const filePath = (baseFolder + importName).replaceAll('//', '/')
        const prevValue = (await fs.existFile(filePath)) ? await fs.readFile(filePath) : null
        undoAcc.push({ prevValue, newValue: fileContent, path: filePath })
        await upsertAsset(fs, filePath, fileContent)
      }
      undoRedoManager.addUndoFile(undoAcc)
      return {}
    },
    async removeAsset(req) {
      const filePath = req.path
      // TODO: remove ALL gltf/glb related files...
      if (await fs.existFile(filePath)) {
        const prevValue = await fs.readFile(filePath)
        await fs.rm(filePath)
        undoRedoManager.addUndoFile([{ prevValue, newValue: null, path: filePath }])
      }
      return {}
    },
    async save() {
      await compositeManager.saveComposite(true)
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
      return {
        path: DIRECTORY.SCENE
      }
    }
  }
}
