import { Entity, JsonSchemaExtended } from '@dcl/ecs'

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
