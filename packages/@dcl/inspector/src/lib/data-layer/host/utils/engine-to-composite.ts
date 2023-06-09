import {
  ComponentData,
  ComponentType,
  Composite,
  CompositeComponent,
  DeepReadonly,
  Entity,
  IEngine,
  LastWriteWinElementSetComponentDefinition,
  PutComponentOperation,
  getCompositeRootComponent
} from '@dcl/ecs'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'

function componentToCompositeComponentData<T>(
  $case: 'json' | 'binary',
  value: DeepReadonly<T>,
  _component: LastWriteWinElementSetComponentDefinition<T>
): ComponentData {
  if ($case === 'json') {
    return {
      data: {
        $case,
        json: value
      }
    }
  } else {
    const byteBuffer = new ReadWriteByteBuffer()
    _component.schema.serialize(value, byteBuffer)
    return {
      data: {
        $case,
        binary: byteBuffer.toBinary()
      }
    }
  }
}

export function dumpEngineToComposite(engine: IEngine, internalDataType: 'json' | 'binary'): Composite {
  const ignoreEntities: Set<Entity> = new Set()
  const composite: Composite.Definition = {
    version: 1,
    components: []
  }

  const CompositeRoot = getCompositeRootComponent(engine)
  const childrenComposite = Array.from(engine.getEntitiesWith(CompositeRoot))
  if (childrenComposite.length > 0) {
    const compositeComponent: CompositeComponent = {
      name: CompositeRoot.componentName,
      jsonSchema: CompositeRoot.schema.jsonSchema,
      data: new Map()
    }

    for (const [compositeRootEntity, compositeRootValue] of childrenComposite) {
      if (compositeRootEntity === engine.RootEntity) continue

      compositeRootValue.entities.forEach((item) => ignoreEntities.add(item.dest))

      const componentData: ComponentData = componentToCompositeComponentData(
        internalDataType,
        {
          src: compositeRootValue.src,
          entities: []
        },
        CompositeRoot
      )
      compositeComponent.data.set(compositeRootEntity, componentData)
    }

    composite.components.push(compositeComponent)
  }

  const ignoreComponentNames = ['inspector:Selection', 'editor::Toggle', CompositeRoot.componentName]

  for (const itComponentDefinition of engine.componentsIter()) {
    if (ignoreComponentNames.includes(itComponentDefinition.componentName)) continue

    // TODO: will we support APPEND components?
    if (itComponentDefinition.componentType === ComponentType.GrowOnlyValueSet) continue

    const itCompositeComponent: CompositeComponent = {
      name: itComponentDefinition.componentName,
      jsonSchema: itComponentDefinition.schema.jsonSchema,
      data: new Map()
    }

    for (const [entity, value] of engine.getEntitiesWith(itComponentDefinition)) {
      // TODO: see for overrides? check if the value has changed or not (should we tag it?)
      // For now, the entities from children composite are ignored
      if (ignoreEntities.has(entity)) continue

      const componentData: ComponentData = componentToCompositeComponentData(
        internalDataType,
        value,
        itComponentDefinition as LastWriteWinElementSetComponentDefinition<unknown>
      )
      itCompositeComponent.data.set(entity, componentData)
    }

    // TODO: should we save defined component but without entities assigned?
    if (itCompositeComponent.data.size > 0) {
      composite.components.push(itCompositeComponent)
    }
  }
  return composite
}

export function dumpEngineToCrdtCommands(engine: IEngine): Uint8Array {
  const componentBuffer = new ReadWriteByteBuffer()
  const crdtBuffer = new ReadWriteByteBuffer()
  for (const itComponentDefinition of engine.componentsIter()) {
    for (const [entity, value] of engine.getEntitiesWith(itComponentDefinition)) {
      if (value) {
        componentBuffer.resetBuffer()
        itComponentDefinition.schema.serialize(value, componentBuffer)

        PutComponentOperation.write(
          entity,
          0,
          itComponentDefinition.componentId,
          componentBuffer.toBinary(),
          crdtBuffer
        )
      }
    }
  }

  return crdtBuffer.toBinary()
}
