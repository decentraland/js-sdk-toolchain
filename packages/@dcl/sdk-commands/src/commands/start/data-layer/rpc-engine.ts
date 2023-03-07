import * as components from '@dcl/ecs/dist/cjs/components'
import { Schemas, IEngine, Engine, Entity, DeepReadonly, LastWriteWinElementSetComponentDefinition } from '@dcl/ecs'
import { ByteBuffer, ReadWriteByteBuffer } from '@dcl/ecs/dist/cjs/serialization/ByteBuffer'
import { CliComponents } from '../../../components'
import { resolve } from 'path'

type ComponentName = string
type EngineState = Record<number, Record<ComponentName, DeepReadonly<unknown>>>

function getEngineState(engine: IEngine): EngineState {
  const entities: EngineState = {}

  for (const component of engine.componentsIter()) {
    for (const [entity, componentValue] of engine.getEntitiesWith(component)) {
      // Initialize if its empty
      entities[entity] ??= {}
      entities[entity][component.componentName] = componentValue
    }
  }

  return entities
}

export async function saveEngineState(components: Pick<CliComponents, 'fs'>, path: string, engine: IEngine) {
  const engineState = getEngineState(engine)
  await components.fs.writeFile(resolve(path, 'engine-state.json'), JSON.stringify(engineState, null, 2))
}

/**
 * Serialize engine and send the Messages to the inspector/babylon engine
 */
export function serializeEngine(engine: IEngine) {
  const messages: ByteBuffer = new ReadWriteByteBuffer()

  // TODO: add deleted entities messages
  // add component values
  for (const component of engine.componentsIter()) {
    component.dumpCrdtState(messages)
  }
  return messages.toBinary()
}

function createEditorComponents(engine: IEngine) {
  const Label = engine.defineComponent('inspector::Label', {
    label: Schemas.String
  })

  const EntitySelected = engine.defineComponent('editor::EntitySelected', {
    gizmo: Schemas.Int
  })

  const Toggle = engine.defineComponent('inspector::Toggle', {})
  const Transform = components.Transform(engine as any)
  const MeshRenderer = components.MeshRenderer(engine as any)
  return { Label, EntitySelected, Toggle, Transform, MeshRenderer }
}

let engine: IEngine
export async function createEngine(state: EngineState): Promise<IEngine> {
  if (engine) return engine

  engine = Engine({
    onChangeFunction: function (entity, operation, component, value) {
      // TODO: undo-redo logic
    }
  })

  createEditorComponents(engine)

  /**
   * Start engine from engine-state.json file
   */
  for (const entityString in state) {
    const entity: Entity = Number(entityString) as Entity
    const entityComponents = state[entity]
    for (const componentName in entityComponents) {
      const component = engine.getComponent(componentName) as LastWriteWinElementSetComponentDefinition<unknown>
      component.createOrReplace(entity, entityComponents[componentName])
    }
  }

  await engine.update(1)
  return engine
}
