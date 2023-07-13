import {
  ComponentDefinition,
  Composite,
  CompositeDefinition,
  CrdtMessageType,
  Entity,
  EntityMappingMode,
  IEngine
} from '@dcl/ecs'
import { EditorComponentNames } from '../../../sdk/components'
import { dumpEngineToComposite, dumpEngineToCrdtCommands } from './engine-to-composite'
import { FileSystemInterface } from '../../types'
import { CompositeManager, createFsCompositeProvider } from './fs-composite-provider'
import { getMinimalComposite } from '../../client/feeded-local-fs'
import { InspectorPreferences } from '../../../logic/preferences/types'
import { buildNodesHierarchyIfNotExists } from '../utils/migrations/build-nodes-hierarchy'
import { removeLegacyEntityNodeComponents } from '../utils/migrations/legacy-entity-node'

enum DirtyEnum {
  // No changes
  None,
  // Changes but that it doesnt affect the composite
  Dirty,
  // Changes that need to be sync with the composite
  DirtyAndDump
}

// TODO: version this as proper migrations...
function runMigrations(engine: IEngine) {
  // Handle old EntityNode components
  removeLegacyEntityNodeComponents(engine)
  // Build Nodes component value if not exists
  buildNodesHierarchyIfNotExists(engine)
}

async function instanciateComposite(fs: FileSystemInterface, engine: IEngine, path: string): Promise<CompositeManager> {
  if (!(await fs.existFile(path))) {
    await fs.writeFile(path, Buffer.from(JSON.stringify(getMinimalComposite(), null, 2), 'utf-8'))
  }

  const compositeProvider = await createFsCompositeProvider(fs)
  const mainComposite = compositeProvider.getCompositeOrNull(path)
  if (!mainComposite) throw new Error('Invalid composite')

  Composite.instance(engine, mainComposite, compositeProvider, {
    entityMapping: {
      type: EntityMappingMode.EMM_DIRECT_MAPPING,
      getCompositeEntity: (entity: number | Entity) => entity as Entity
    }
  })

  runMigrations(engine)

  return compositeProvider
}

export async function compositeAndDirty(
  fs: FileSystemInterface,
  engine: IEngine,
  getInspectorPreferences: () => InspectorPreferences,
  compositePath: string
) {
  let composite: CompositeDefinition
  let dirty: DirtyEnum = DirtyEnum.None

  // Look for a composite
  const compositeProvider = await instanciateComposite(fs, engine, compositePath)

  async function dumpEngineAndGetComposite(dump: boolean = true): Promise<CompositeDefinition | null> {
    try {
      // TODO: hardcoded for the moment. the ID should be the selected composite id name.
      // composite.id = 'main'
      composite = dumpEngineToComposite(engine, 'json')

      if (!dump) {
        return composite
      }

      const mainCrdt = dumpEngineToCrdtCommands(engine)
      await fs.writeFile('main.crdt', Buffer.from(mainCrdt))
      await compositeProvider.save({ src: compositePath, composite }, 'json')

      return composite
    } catch (e) {
      console.log('Failed saving composite')
    }
    return null
  }

  async function saveComposite(dump: boolean = true) {
    composite = (await dumpEngineAndGetComposite(dump)) ?? composite
  }

  engine.addSystem(() => {
    if (dirty !== DirtyEnum.None) {
      void saveComposite(getInspectorPreferences().autosaveEnabled && dirty === DirtyEnum.DirtyAndDump)
    }
    dirty = DirtyEnum.None
  }, -1_000_000_000)

  return {
    onChange: (
      _entity: Entity,
      operation: CrdtMessageType,
      component: ComponentDefinition<unknown> | undefined,
      _componentValue: unknown
    ) => {
      // // No create dirty state if the changes are not needed to be dumped
      if (
        !component ||
        component.componentName === EditorComponentNames.Scene ||
        component.componentName === EditorComponentNames.Selection
      ) {
        if (dirty === DirtyEnum.None) dirty = DirtyEnum.Dirty
        return
      }
      // // No create dirty state if its an invalid operation
      if (operation !== CrdtMessageType.PUT_COMPONENT && operation !== CrdtMessageType.DELETE_COMPONENT) {
        return
      }
      dirty = DirtyEnum.DirtyAndDump
    },
    get composite() {
      return composite
    },
    get dirty() {
      return dirty
    },
    saveComposite
  }
}
