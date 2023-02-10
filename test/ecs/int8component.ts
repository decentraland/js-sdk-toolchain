import { ByteBuffer, Entity, IEngine } from '../../packages/@dcl/ecs/src/engine'
import { componentNumberFromName } from '../../packages/@dcl/ecs/src/components/component-number'
import { createGetCrdtMessages, createUpdateFromCrdt } from '../../packages/@dcl/ecs/src/engine/component'
import * as components from '../../packages/@dcl/ecs/src/components'

import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'

export const componentName = 'int8'
export const ID = componentNumberFromName(componentName)

export const int8Component = (engine: IEngine) => {
  const data = new Map<Entity, number>()
  const timestamps = new Map<Entity, number>()
  const dirtyIterator = new Set<Entity>()
  const schema = {
    serialize(value: number, builder: ByteBuffer) {
      builder.writeInt8(value)
    },
    deserialize(reader: ByteBuffer) {
      return reader.readInt8()
    }
  }
  type Type = components.ComponentDefinition<any> & { setTestTimestamp(entity: Entity, timestamp: number): void }
  const component: Type = {
    componentId: ID,
    componentName: componentName,
    updateFromCrdt: createUpdateFromCrdt(ID, timestamps, schema, data),
    default: function () {
      return 0
    },
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
    getMutable: function (_entity: Entity) {
      throw new Error('Function not implemented.')
    },
    getMutableOrNull: function (_entity: Entity) {
      throw new Error('Function not implemented.')
    },
    upsertFromBinary: function (entity: Entity, buf: ByteBuffer, marksDirty = true) {
      data.set(entity, buf.readInt8())
      if (marksDirty) {
        dirtyIterator.add(entity)
      } else {
        dirtyIterator.delete(entity)
      }
    },
    toBinary: function (entity: Entity): ByteBuffer {
      const b = new ReadWriteByteBuffer()
      b.writeInt8(data.get(entity)!)
      return b
    },
    toBinaryOrNull: function (entity: Entity): ByteBuffer | null {
      if (!data.has(entity)) return null
      const b = new ReadWriteByteBuffer()
      b.writeInt8(data.get(entity)!)
      return b
    },
    deserialize(buffer) {
      return buffer.readInt8()
    },
    writeToByteBuffer: function (entity: Entity, buffer: ByteBuffer): void {
      buffer.writeInt8(data.get(entity)!)
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
    isDirty: function (entity: Entity): boolean {
      return dirtyIterator.has(entity)
    },
    getCrdtUpdates: createGetCrdtMessages(ID, timestamps, dirtyIterator, schema, data),
    setTestTimestamp(entity: Entity, timestamp: number) {
      timestamps.set(entity, (timestamps.get(entity) || 0) + timestamp)
    }
  }

  return engine.registerComponentDefinition(componentName, component) as Type
}
