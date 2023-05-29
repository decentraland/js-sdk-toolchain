import { DeepReadonly, ISchema } from '@dcl/ecs'
import { componentNumberFromName } from '@dcl/ecs/dist/components/component-number'
import {
  ApplyComponentOperation,
  ComponentDeclaration
} from 'decentraland-babylon/src/lib/decentraland/crdt-internal/components'

/**
 * This function creates a serializer and deserializer based on a Protobufjs type
 */
export function declareComponentSchemaDefinedComponent<T, X extends string>(
  componentName: X,
  schema: ISchema<T>,
  applyChanges: ApplyComponentOperation<T>
): ComponentDeclaration<T, number> & { componentName: X } {
  const componentId = componentNumberFromName(componentName)

  return {
    componentId: componentId,
    componentName,
    applyChanges,
    deserialize(buffer) {
      return schema.deserialize(buffer)
    },
    serialize(value, buffer) {
      schema.serialize(value as DeepReadonly<T>, buffer)
    }
  }
}
