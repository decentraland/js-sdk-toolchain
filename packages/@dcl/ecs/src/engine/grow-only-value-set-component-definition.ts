import { ISchema } from '../schemas'
import { ReadWriteByteBuffer } from '../serialization/ByteBuffer'
import { AppendValueMessageBody, AppendValueOperation, CrdtMessageType } from '../serialization/crdt'
import { ComponentType, GrowOnlyValueSetComponentDefinition } from './component'
import { __DEV__ } from '../runtime/invariant'
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
 * @public
 */
export type ValueSetOptions<T> = {
  // function that returns a timestamp from the value
  timestampFunction: (value: DeepReadonly<T>) => number
  // max elements to store in memory, ordered by timestamp
  maxElements: number
}

/**
 * @internal
 */
export function createValueSetComponentDefinitionFromSchema<T>(
  componentName: string,
  componentId: number,
  schema: ISchema<T>,
  options: ValueSetOptions<T>
): GrowOnlyValueSetComponentDefinition<T> {
  type InternalDatastructure = {
    raw: Array<{ value: DeepReadonly<T>; timestamp: number }>
    frozenSet: DeepReadonlySet<T>
  }
  const data = new Map<Entity, InternalDatastructure>()
  const dirtyIterator = new Set<Entity>()
  const queuedCommands: AppendValueMessageBody[] = []
  const onChangeCallbacks = new Map<Entity, (data: T | undefined) => void>()

  // only sort the array if the latest (N) element has a timestamp <= N-1
  function shouldSort(row: InternalDatastructure) {
    const len = row.raw.length
    if (len > 1 && row.raw[len - 1].timestamp <= row.raw[len - 2].timestamp) {
      return true
    }
    return false
  }

  function gotUpdated(entity: Entity): DeepReadonlySet<T> {
    const row = data.get(entity)
    /* istanbul ignore else */
    if (row) {
      if (shouldSort(row)) {
        row.raw.sort(sortByTimestamp)
      }
      while (row.raw.length > options.maxElements) {
        row.raw.shift()
      }
      const frozenSet: DeepReadonlySet<T> = freezeSet(new Set(row?.raw.map(($) => $.value)))
      row.frozenSet = frozenSet
      return frozenSet
    } else {
      /* istanbul ignore next */
      return emptyReadonlySet as any
    }
  }

  function append(entity: Entity, value: DeepReadonly<T>) {
    let row = data.get(entity)
    if (!row) {
      row = { raw: [], frozenSet: emptyReadonlySet as any }
      data.set(entity, row)
    }
    const usedValue = schema.extend ? (schema.extend(value) as DeepReadonly<T>) : value
    const timestamp = options.timestampFunction(usedValue as any)
    if (__DEV__) {
      // only freeze the objects in dev mode to warn the developers because
      // it is an expensive operation
      Object.freeze(usedValue)
    }
    row.raw.push({ value: usedValue, timestamp })
    return { set: gotUpdated(entity), value: usedValue }
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
    entityDeleted(entity: Entity): void {
      data.delete(entity)
    },
    get(entity: Entity): DeepReadonlySet<T> {
      const values = data.get(entity)
      if (values) {
        return values.frozenSet
      } else {
        return emptyReadonlySet as any
      }
    },
    addValue(entity: Entity, rawValue: DeepReadonly<T>) {
      const { set, value } = append(entity, rawValue)
      dirtyIterator.add(entity)
      const buf = new ReadWriteByteBuffer()
      schema.serialize(value, buf)
      queuedCommands.push({
        componentId,
        data: buf.toBinary(),
        entityId: entity,
        timestamp: 0,
        type: CrdtMessageType.APPEND_VALUE
      })
      return set
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
    getCrdtUpdates() {
      // return a copy of the commands, and then clear the local copy
      dirtyIterator.clear()
      return queuedCommands.splice(0, queuedCommands.length)
    },
    updateFromCrdt(_body) {
      if (_body.type === CrdtMessageType.APPEND_VALUE) {
        const buf = new ReadWriteByteBuffer(_body.data)
        const { value } = append(_body.entityId, schema.deserialize(buf) as DeepReadonly<T>)
        return [null, value as T]
      }
      return [null, undefined]
    },
    dumpCrdtStateToBuffer: function (buffer, filterEntity): void {
      for (const [entity, { raw }] of data) {
        if (filterEntity && !filterEntity(entity)) continue
        for (const it of raw) {
          const buf = new ReadWriteByteBuffer()
          schema.serialize(it.value, buf)
          AppendValueOperation.write(entity, 0, componentId, buf.toBinary(), buffer)
        }
      }
    },
    onChange(entity, cb) {
      onChangeCallbacks.set(entity, cb)
    },
    __onChangeCallbacks(entity) {
      return onChangeCallbacks.get(entity)
    }
  }

  return ret
}
