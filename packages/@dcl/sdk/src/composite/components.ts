import { engine, Schemas } from '@dcl/ecs'

export const CompositeRoot = engine.defineComponent('composite::root', {
  id: Schemas.String,
  entities: Schemas.Array(
    Schemas.Map({
      src: Schemas.Entity,
      dest: Schemas.Entity
    })
  )
})
