import { Entity } from '../engine/entity'
import { JsonSchemaExtended } from '../schemas/ISchema'

export type Composite = {
  id: string
  components: {
    name: string
    schema?: JsonSchemaExtended
    data: Map<Entity, unknown>
  }[]
}

export type CompositeProvider = {
  getCompositeOrNull: (id: string) => Composite | null
}
