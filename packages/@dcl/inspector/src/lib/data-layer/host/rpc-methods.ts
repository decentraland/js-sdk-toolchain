import {
  Entity,
  EntityMappingMode,
  IEngine,
  Composite,
  OnChangeFunction,
  CompositeDefinition,
  LastWriteWinElementSetComponentDefinition,
  Name,
  Transform
} from '@dcl/ecs'

import { DataLayerRpcServer, FileSystemInterface } from '../types'
import { getFilesInDirectory } from './fs-utils'
import { dumpEngineToComposite, dumpEngineToCrdtCommands } from './utils/engine-to-composite'
import { createFsCompositeProvider } from './utils/fs-composite-provider'
import { stream } from './stream'
import { FileOperation, initUndoRedo } from './undo-redo'
import { getMinimalComposite } from '../client/feeded-local-fs'
import upsertAsset from './upsert-asset'
import { initSceneProvider } from './scene'
import { readPreferencesFromFile, serializeInspectorPreferences } from '../../logic/preferences/io'

const INSPECTOR_PREFERENCES_PATH = 'inspector-preferences.json'

export async function initRpcMethods(
  fs: FileSystemInterface,
  engine: IEngine,
  onChanges: OnChangeFunction[]
): Promise<DataLayerRpcServer> {
  let inspectorPreferences = await readPreferencesFromFile(fs, INSPECTOR_PREFERENCES_PATH)

  // Look for a composite
  const currentCompositeResourcePath = 'main.composite'

  if (!(await fs.existFile(currentCompositeResourcePath))) {
    await fs.writeFile(currentCompositeResourcePath, Buffer.from(JSON.stringify(getMinimalComposite()), 'utf-8'))
  }

  function dumpEngineAndGetComposite(dump: boolean = true): CompositeDefinition {
    // TODO: hardcoded for the moment. the ID should be the selected composite id name.
    // composite.id = 'main'
    const composite = dumpEngineToComposite(engine, 'json')

    if (!dump) return composite

    const mainCrdt = dumpEngineToCrdtCommands(engine)
    fs.writeFile('main.crdt', Buffer.from(mainCrdt)).catch((err) => console.error('Failed saving main.crdt: ', err))
    compositeProvider
      .save({ src: currentCompositeResourcePath, composite }, 'json')
      .catch((err) => console.error(`Save composite ${currentCompositeResourcePath} fails: `, err))

    return composite
  }

  function saveComposite(dump: boolean = true) {
    composite = dumpEngineAndGetComposite(dump)
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

  // Legacy EntityNode for backwards-compability
  function legacyEntityNode() {
    engine.removeSystem(legacyEntityNode)
    const LegacyEntityNodeComponent = engine.getComponentOrNull(
      'inspector::EntityNode'
    ) as LastWriteWinElementSetComponentDefinition<{ label: string; parent: Entity }>
    if (!LegacyEntityNodeComponent) return

    for (const [entity, entityNodeValue] of engine.getEntitiesWith(LegacyEntityNodeComponent)) {
      LegacyEntityNodeComponent.deleteFrom(entity)
      const NameComponent = engine.getComponent(Name.componentId) as typeof Name
      const TransformComponent = engine.getComponent(Transform.componentId) as typeof Transform
      NameComponent.createOrReplace(entity, { value: entityNodeValue.label })
      const transform = TransformComponent.getMutableOrNull(entity)
      if (transform) {
        transform.parent = entityNodeValue.parent
      } else {
        TransformComponent.create(entity, { parent: entityNodeValue.parent })
      }
    }
    engine.removeComponentDefinition(LegacyEntityNodeComponent.componentId)
    void dumpEngineAndGetComposite(true)
  }
  engine.addSystem(legacyEntityNode)
  // END Legacy Entity Node

  let dirty = false
  let composite: CompositeDefinition
  const undoRedo = initUndoRedo(fs, engine, () => composite)
  const scene = initSceneProvider(fs)

  // Create containers and attach onChange logic.
  onChanges.push(undoRedo.onChange)
  onChanges.push(scene.onChange)
  onChanges.push(() => (dirty = true))

  engine.addSystem(() => {
    if (dirty) {
      saveComposite(inspectorPreferences.autosaveEnabled)
    }
    dirty = false
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
     * It generates an undo operation.
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
    },
    async removeAsset(req) {
      const filePath = req.path
      // TODO: remove ALL gltf/glb related files...
      if (await fs.existFile(filePath)) {
        const prevValue = await fs.readFile(filePath)
        await fs.rm(filePath)
        undoRedo.addUndoFile([{ prevValue, newValue: null, path: filePath }])
      }
      return {}
    },
    async save() {
      saveComposite(true)
      return {}
    },
    async getInspectorPreferences() {
      return inspectorPreferences
    },
    async setInspectorPreferences(req) {
      inspectorPreferences = req
      await fs.writeFile(INSPECTOR_PREFERENCES_PATH, serializeInspectorPreferences(req))
      return {}
    }
  }
}
