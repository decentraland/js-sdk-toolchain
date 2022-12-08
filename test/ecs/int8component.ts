import { ByteBuffer, Entity, IEngine } from '../../packages/@dcl/ecs/src/engine'
import * as components from '../../packages/@dcl/ecs/src/components'

import { createByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'

export const ID = 123987
export const int8Component = (engine: IEngine) => {
  const values = new Map<Entity, number>()
  const dirtyIterator = new Set<Entity>()

  const component: components.ComponentDefinition<any, number> = {
    _id: ID,
    default: function () {
      return 0
    },
    has: function (entity: Entity): boolean {
      return values.has(entity)
    },
    get: function (entity: Entity) {
      if (!values.has(entity)) throw new Error(`Entity don't have component`)
      return values.get(entity)
    },
    getOrNull: function (entity: Entity) {
      return values.get(entity) ?? null
    },
    create: function (entity: Entity, val?: number) {
      if (values.has(entity)) throw new Error(`Entity already has component`)
      values.set(entity, (val || 0) % 256 | 0)
      dirtyIterator.add(entity)
    },
    createOrReplace: function (entity: Entity, val?: any) {
      values.set(entity, (val || 0) % 256 | 0)
      dirtyIterator.add(entity)
    },
    deleteFrom: function (entity: Entity, markAsDirty = true) {
      values.delete(entity)
      if (markAsDirty) {
        dirtyIterator.add(entity)
      }
    },
    getMutable: function (entity: Entity) {
      throw new Error('Function not implemented.')
    },
    getMutableOrNull: function (entity: Entity) {
      throw new Error('Function not implemented.')
    },
    upsertFromBinary: function (
      entity: Entity,
      data: ByteBuffer,
      marksDirty = true
    ) {
      values.set(entity, data.readInt8())
      if (marksDirty) {
        dirtyIterator.add(entity)
      } else {
        dirtyIterator.delete(entity)
      }
    },
    updateFromBinary: function (
      entity: Entity,
      data: ByteBuffer,
      marksDirty = true
    ) {
      values.set(entity, data.readInt8())
      if (marksDirty) {
        dirtyIterator.add(entity)
      } else {
        dirtyIterator.delete(entity)
      }
    },
    toBinary: function (entity: Entity): ByteBuffer {
      const b = createByteBuffer()
      b.writeInt8(values.get(entity)!)
      return b
    },
    toBinaryOrNull: function (entity: Entity): ByteBuffer | null {
      if (!values.has(entity)) return null
      const b = createByteBuffer()
      b.writeInt8(values.get(entity)!)
      return b
    },
    writeToByteBuffer: function (entity: Entity, buffer: ByteBuffer): void {
      buffer.writeInt8(values.get(entity)!)
    },
    *iterator() {
      for (const [entity, component] of values) {
        yield [entity, component]
      }
    },
    *dirtyIterator() {
      for (const entity of dirtyIterator) {
        yield entity
      }
    },
    clearDirty: function (): void {
      dirtyIterator.clear()
    },
    isDirty: function (entity: Entity): boolean {
      return dirtyIterator.has(entity)
    }
  }

  return engine.registerCustomComponent(component, ID)
}
