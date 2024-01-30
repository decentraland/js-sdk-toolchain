import { ByteBuffer, ComponentType, Entity, IEngine } from '../../packages/@dcl/ecs/src/engine'
import { ISchema } from '../../packages/@dcl/ecs/src/schemas/ISchema'
import { componentNumberFromName } from '../../packages/@dcl/ecs/src/components/component-number'
import {
  createGetCrdtMessagesForLww,
  createDumpLwwFunctionFromCrdt,
  createUpdateLwwFromCrdt
} from '../../packages/@dcl/ecs/src/engine/lww-element-set-component-definition'
import * as components from '../../packages/@dcl/ecs/src/components'

export const componentName = 'int8'
export const ID = componentNumberFromName(componentName)

export const int8Component = (engine: IEngine) => {
  const data = new Map<Entity, number>()
  const timestamps = new Map<Entity, number>()
  const dirtyIterator = new Set<Entity>()
  const schema: ISchema<number> = {
    serialize(value: number, builder: ByteBuffer): void {
      builder.writeInt8(value)
    },
    deserialize(reader: ByteBuffer): number {
      return reader.readInt8()
    },
    create() {
      return 0
    },
    jsonSchema: {
      type: 'integer',
      serializationType: 'int8'
    }
  }
  type Type = components.LastWriteWinElementSetComponentDefinition<any> & {
    setTestTimestamp(entity: Entity, timestamp: number): void
  }
  const component: Type = {
    componentId: ID,
    componentName: componentName,
    componentType: ComponentType.LastWriteWinElementSet,
    updateFromCrdt: createUpdateLwwFromCrdt(ID, timestamps, schema, data),
    schema,
    has: function (entity: Entity): boolean {
      return data.has(entity)
    },
    get: function (entity: Entity) {
      if (!data.has(entity)) throw new Error(`Entity don't have component`)
      return data.get(entity)
    },
    getOrNull: function (entity: Entity) {
      return data.get(entity) ?? null
    },
    create: function (entity: Entity, val?: number) {
      if (data.has(entity)) throw new Error(`Entity already has component`)
      data.set(entity, (val || 0) % 256 | 0)
      dirtyIterator.add(entity)
    },
    createOrReplace: function (entity: Entity, val?: any) {
      data.set(entity, (val || 0) % 256 | 0)
      dirtyIterator.add(entity)
    },
    deleteFrom: function (entity: Entity, markAsDirty = true) {
      data.delete(entity)
      if (markAsDirty) {
        dirtyIterator.add(entity)
      }
    },
    entityDeleted: function (entity: Entity, markAsDirty) {
      if (data.delete(entity) && markAsDirty) {
        dirtyIterator.add(entity)
      }
    },
    getMutable: function (_entity: Entity) {
      throw new Error('Function not implemented.')
    },
    getMutableOrNull: function (_entity: Entity) {
      throw new Error('Function not implemented.')
    },
    getOrCreateMutable: function (_entity: Entity) {
      throw new Error('Function not implemented.')
    },
    *iterator() {
      for (const [entity, component] of data) {
        yield [entity, component]
      }
    },
    *dirtyIterator() {
      for (const entity of dirtyIterator) {
        yield entity
      }
    },
    getCrdtUpdates: createGetCrdtMessagesForLww(ID, timestamps, dirtyIterator, schema, data),
    setTestTimestamp(entity: Entity, timestamp: number) {
      timestamps.set(entity, (timestamps.get(entity) || 0) + timestamp)
    },
    dumpCrdtStateToBuffer: createDumpLwwFunctionFromCrdt(ID, timestamps, schema, data),
    onChange: () => {},
    __onChangeCallbacks() {
      return undefined
    }
  }

  return engine.registerComponentDefinition(componentName, component) as Type
}
