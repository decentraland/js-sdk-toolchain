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
  const specReflection = Object.keys(specs).reduce((specReflection, currentKey) => {
    specReflection[currentKey] = specs[currentKey].jsonSchema
    return specReflection
  }, {} as Record<string, any>)

  return {
    serialize({ $case, value }: DeepReadonly<OneOfType<T>>, builder: ByteBuffer): void {
      builder.writeUtf8String($case.toString())
      ;(specs as any)[$case].serialize(value, builder)
    },
    deserialize(reader: ByteBuffer) {
      const $case = reader.readUtf8String()
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
