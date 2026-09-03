import { DeepReadonly } from '../engine/readonly'
import { ByteBuffer } from '../serialization/ByteBuffer'
import { ISchema } from './ISchema'
import { Spec } from './Map'

type OneOfType<T extends Spec> = {
  [K in keyof T]: {
    readonly $case: K
    readonly value: ReturnType<T[K]['deserialize']>
  }
}[keyof T]

/** Reserved case index for a value whose case was never selected. */
const NO_CASE = 0

export const IOneOf = <T extends Spec>(specs: T): ISchema<OneOfType<T>> => {
  const specKeys = Object.keys(specs)
  const keyToIndex = specKeys.reduce((dict: Record<string, number>, key, index) => {
    dict[key] = index
    return dict
  }, {})
  const specReflection = specKeys.reduce((specReflection, currentKey) => {
    specReflection[currentKey] = specs[currentKey].jsonSchema
    return specReflection
  }, {} as Record<string, any>)

  return {
    serialize({ $case, value }: DeepReadonly<OneOfType<T>>, builder: ByteBuffer): void {
      // `create()` selects no case, so a field the scene never set arrives here
      // with an undefined `$case`. Index 0 is free, cases start at 1.
      if ($case === undefined) {
        builder.writeUint8(NO_CASE)
        return
      }

      const _value = keyToIndex[$case.toString()] + 1
      builder.writeUint8(_value)
      ;(specs as any)[$case].serialize(value, builder)
    },
    deserialize(reader: ByteBuffer) {
      const caseIndex = reader.readInt8()
      if (caseIndex === NO_CASE) {
        return {} as OneOfType<T>
      }

      const $case = specKeys[caseIndex - 1]
      const value = specs[$case].deserialize(reader)
      return { $case, value }
    },
    create() {
      return {} as OneOfType<T>
    },
    jsonSchema: {
      type: 'object',
      properties: specReflection,
      serializationType: 'one-of'
    }
  }
}
