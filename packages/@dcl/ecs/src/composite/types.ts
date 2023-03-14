import { Entity } from '../engine/entity'
import { JsonSchemaExtended } from '../schemas/ISchema'

/**
 * @public
 * @deprecated composite is not being supported so far, please do not use this feature
 */
export type Composite = {
  id: string
  components: {
    name: string
    schema?: JsonSchemaExtended
    data: Map<Entity, unknown>
  }[]
}

/**
 * @public
 * @deprecated composite is not being supported so far, please do not use this feature
 */
export type CompositeProvider = {
  getCompositeOrNull: (id: string) => Composite | null
}
