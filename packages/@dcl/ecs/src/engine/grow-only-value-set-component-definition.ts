import { ISchema } from '../schemas'
import { ReadWriteByteBuffer, ByteBuffer } from '../serialization/ByteBuffer'
import { ComponentType, GrowOnlyValueSetComponentDefinition } from './component'
import { Entity } from './entity'
import { DeepReadonly, DeepReadonlySet } from './readonly'

const emptyReadonlySet = freezeSet(new Set())

function frozenError() {
  throw new Error('The set is frozen')
}

function freezeSet<T>(set: Set<T>): ReadonlySet<T> {
  ;(set as any).add = frozenError
  ;(set as any).clear = frozenError

  return set as ReadonlySet<T>
}

function sortByTimestamp(a: { timestamp: number }, b: { timestamp: number }) {
  return a.timestamp > b.timestamp ? 1 : -1
}

/**
 * @internal
 */
export function createValueSetComponentDefinitionFromSchema<T>(
  componentName: string,
  componentId: number,
  schema: ISchema<T>,
  options: {
    // function that returns a timestamp from the value
    timestampFunction: (value: DeepReadonly<T>) => number
    // max elements to store in memory, ordered by timestamp
    maxElements: number
  }
): GrowOnlyValueSetComponentDefinition<T> {
  type InternalDatastructure = {
    raw: Array<{ value: DeepReadonly<T>; timestamp: number }>
    frozenSet: DeepReadonlySet<T>
  }
  const data = new Map<Entity, InternalDatastructure>()
  const dirtyIterator = new Set<Entity>()

  function gotUpdated(entity: Entity) {
    const row = data.get(entity)
    if (row) {
      row.raw.sort(sortByTimestamp)
      const frozenSet: DeepReadonlySet<T> = freezeSet(new Set(row?.raw.map(($) => $.value)))
      row.frozenSet = frozenSet
      return frozenSet
    } else {
      return emptyReadonlySet as any
    }
  }

  const ret: GrowOnlyValueSetComponentDefinition<T> = {
    get componentId() {
      return componentId
    },
    get componentName() {
      return componentName
    },
    get componentType() {
      // a getter is used here to prevent accidental changes
      return ComponentType.GrowOnlyValueSet as const
    },
    schema,
    has(entity: Entity): boolean {
      return data.has(entity)
    },
    entityDeleted(entity: Entity, markAsDirty: boolean): void {
      if (data.delete(entity) && markAsDirty) {
        dirtyIterator.add(entity)
      }
    },
    get(entity: Entity): DeepReadonlySet<T> {
      const values = data.get(entity)
      if (values) {
        return values.frozenSet
      } else {
        return emptyReadonlySet as any
      }
    },
    addValue(entity: Entity, value: DeepReadonly<T>) {
      let row = data.get(entity)
      if (!row) {
        row = { raw: [], frozenSet: emptyReadonlySet as any }
        data.set(entity, row)
      }
      const usedValue = schema.extend ? (schema.extend(value) as DeepReadonly<T>) : value
      row.raw.push({ value: usedValue, timestamp: options.timestampFunction(usedValue as any) })
      dirtyIterator.add(entity)
      return gotUpdated(entity)
    },
    *iterator(): Iterable<[Entity, Iterable<DeepReadonly<T>>]> {
      for (const [entity, component] of data) {
        yield [entity, component.frozenSet]
      }
    },
    *dirtyIterator(): Iterable<Entity> {
      for (const entity of dirtyIterator) {
        yield entity
      }
    },
    *getCrdtUpdates() {},
    updateFromCrdt(_body) {
      return [null, undefined]
    }
  }

  return ret
}
