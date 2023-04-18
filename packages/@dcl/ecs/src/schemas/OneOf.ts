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
      const _value = keyToIndex[$case.toString()] + 1
      builder.writeUint8(_value)
      ;(specs as any)[$case].serialize(value, builder)
    },
    deserialize(reader: ByteBuffer) {
      const $case = specKeys[reader.readInt8() - 1]
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
