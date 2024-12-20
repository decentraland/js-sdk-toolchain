import { IEngine, OnChangeFunction } from '@dcl/ecs'
import { DataLayerRpcServer, FileSystemInterface } from '../types'
import { DIRECTORY, EXTENSIONS, getCurrentCompositePath, getFilesInDirectory, withAssetDir } from './fs-utils'
import { stream } from './stream'
import { FileOperation, initUndoRedo } from './undo-redo'
import upsertAsset from './upsert-asset'
import { initSceneProvider } from './scene'
import { readPreferencesFromFile, serializeInspectorPreferences } from '../../logic/preferences/io'
import { compositeAndDirty } from './utils/composite-dirty'
import { installBin } from './utils/install-bin'
import { AssetData } from '../../logic/catalog'

const INSPECTOR_PREFERENCES_PATH = 'inspector-preferences.json'

export async function initRpcMethods(
  fs: FileSystemInterface,
  engine: IEngine,
  onChanges: OnChangeFunction[]
): Promise<DataLayerRpcServer> {
  const sceneProvider = await initSceneProvider(fs)
  const currentCompositeResourcePath = getCurrentCompositePath()
  let inspectorPreferences = await readPreferencesFromFile(fs, INSPECTOR_PREFERENCES_PATH)

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

  // install bin
  await installBin(fs)

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
    async getFiles({ path, ignore = [] }) {
      const filesInDir = await getFilesInDirectory(fs, path, [], true, ignore)
      const files = await Promise.all(
        filesInDir.map(async ($) => ({
          path: $,
          content: await fs.readFile($)
        }))
      )
      return { files }
    },
    async saveFile({ path, content }) {
      // TODO: overwrite exception?
      await fs.writeFile(path, Buffer.from(content))
      return {}
    },
    // TODO: we are calling this method in several sagas and considering
    // that we could be using HTTP requests as data-layer mechanism
    // this should be optimized
    async getAssetCatalog() {
      const ignore = ['.git', 'node_modules']
      const basePath = withAssetDir()

      const assets = (await getFilesInDirectory(fs, basePath, [], true, ignore)).filter((item) => {
        const itemLower = item.toLowerCase()
        return EXTENSIONS.some((ext) => itemLower.endsWith(ext))
      })

      return { basePath, assets: assets.map(($) => ({ path: $ })) }
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
    async copyFile(req) {
      const content = await fs.readFile(req.fromPath)
      const prevValue = (await fs.existFile(req.toPath)) ? await fs.readFile(req.toPath) : null
      await fs.writeFile(req.toPath, content)

      // Add undo operation for the file copy
      undoRedoManager.addUndoFile([{ prevValue, newValue: content, path: req.toPath }])

      return {}
    },
    async getFile(req) {
      const content = await fs.readFile(req.path)
      return { content }
    },
    async createCustomAsset(req) {
      const { name, composite, resources } = req

      // Create a slug from the name
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '')

      // Find a unique path by appending numbers if needed
      const basePath = `${DIRECTORY.CUSTOM}`
      let customAssetPath = `${basePath}/${slug}`
      let counter = 1
      while (await fs.existFile(`${customAssetPath}/data.json`)) {
        customAssetPath = `${basePath}/${slug}_${++counter}`
      }

      // Create and save data.json with metadata and composite
      const data: Omit<AssetData, 'composite'> = {
        id: crypto.randomUUID(),
        name,
        category: 'custom',
        tags: []
      }
      await fs.writeFile(`${customAssetPath}/data.json`, Buffer.from(JSON.stringify(data, null, 2)) as Buffer)
      await fs.writeFile(
        `${customAssetPath}/composite.json`,
        Buffer.from(JSON.stringify(JSON.parse(new TextDecoder().decode(composite)), null, 2)) // pretty print
      )

      // Copy all resources to the custom asset folder
      const undoAcc: FileOperation[] = []
      for (const resourcePath of resources) {
        const fileName = resourcePath.split('/').pop()!
        const targetPath = `${customAssetPath}/${fileName}`
        const content = await fs.readFile(resourcePath)

        undoAcc.push({
          prevValue: null,
          newValue: content,
          path: targetPath
        })
        await fs.writeFile(targetPath, content)
      }

      // Add undo operation for the entire asset creation
      undoRedoManager.addUndoFile([
        ...undoAcc,
        {
          prevValue: null,
          newValue: Buffer.from(JSON.stringify(data, null, 2)),
          path: `${customAssetPath}/data.json`
        }
      ])

      return {}
    },
    async getCustomAssets() {
      const paths = await getFilesInDirectory(fs, `${DIRECTORY.CUSTOM}`, [], true)
      const folders = [...new Set(paths.map((path) => path.split('/')[1]))]
      const assets = (
        await Promise.all(
          folders.map(async (path) => {
            try {
              const files = await getFilesInDirectory(fs, `${DIRECTORY.CUSTOM}/${path}`, [], true)
              let dataPath: string | null = null
              let compositePath: string | null = null
              const resources: string[] = []
              for (const file of files) {
                if (file.endsWith('data.json')) {
                  dataPath = file
                } else if (file.endsWith('composite.json')) {
                  compositePath = file
                } else {
                  resources.push(file)
                }
              }
              if (!dataPath || !compositePath) {
                return null
              }
              const data = await fs.readFile(dataPath)
              const composite = await fs.readFile(compositePath)
              const parsedData = JSON.parse(new TextDecoder().decode(data))
              return { ...parsedData, composite: JSON.parse(new TextDecoder().decode(composite)), resources }
            } catch {
              return null
            }
          })
        )
      ).filter((asset): asset is AssetData => asset !== null)
      return { assets: assets.map((asset) => ({ data: Buffer.from(JSON.stringify(asset)) })) }
    },
    async deleteCustomAsset(req) {
      const { assetId } = req
      const paths = await getFilesInDirectory(fs, `${DIRECTORY.CUSTOM}`, [], true)
      const folders = [...new Set(paths.map((path) => path.split('/')[1]))]

      // Keep track of deleted files for undo operation
      const undoAcc: FileOperation[] = []

      for (const folder of folders) {
        const dataPath = `${DIRECTORY.CUSTOM}/${folder}/data.json`

        if (await fs.existFile(dataPath)) {
          try {
            const data = await fs.readFile(dataPath)
            const parsedData = JSON.parse(new TextDecoder().decode(data))

            if (parsedData.id === assetId) {
              // Found the asset to delete - get all files in this folder
              const folderPath = `${DIRECTORY.CUSTOM}/${folder}`
              const files = await getFilesInDirectory(fs, folderPath, [], true)

              // Store file contents for undo operation
              for (const file of files) {
                const content = await fs.readFile(file)
                undoAcc.push({
                  prevValue: content,
                  newValue: null,
                  path: file
                })
                await fs.rm(file)
              }

              // Add undo operation for all deleted files
              undoRedoManager.addUndoFile(undoAcc)

              return {} // Return Empty object as required by the type
            }
          } catch (err) {
            // Skip folders with invalid JSON data
            continue
          }
        }
      }

      throw new Error(`Custom asset with id ${assetId} not found`)
    },
    async renameCustomAsset(req: { assetId: string; newName: string }) {
      const { assetId, newName } = req
      const paths = await getFilesInDirectory(fs, `${DIRECTORY.CUSTOM}`, [], true)
      const folders = [...new Set(paths.map((path) => path.split('/')[1]))]

      const undoAcc: FileOperation[] = []

      for (const folder of folders) {
        const dataPath = `${DIRECTORY.CUSTOM}/${folder}/data.json`

        if (await fs.existFile(dataPath)) {
          try {
            const data = await fs.readFile(dataPath)
            const parsedData = JSON.parse(new TextDecoder().decode(data))

            if (parsedData.id === assetId) {
              const updatedData = { ...parsedData, name: newName }
              const newContent = Buffer.from(JSON.stringify(updatedData, null, 2))

              undoAcc.push({
                prevValue: data,
                newValue: newContent,
                path: dataPath
              })

              await fs.writeFile(dataPath, newContent)
              undoRedoManager.addUndoFile(undoAcc)
              return {}
            }
          } catch (err) {
            continue
          }
        }
      }

      throw new Error(`Custom asset with id ${assetId} not found`)
    }
  }
}
