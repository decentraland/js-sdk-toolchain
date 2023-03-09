import { Entity } from '../engine'
import { IEngine, LastWriteWinElementSetComponentDefinition } from '../engine/types'
import { Schemas } from '../schemas'

type CompositeRoot = {
  id: string
  entities: {
    src: Entity
    dest: Entity
  }[]
}

export function CompositeRoot(engine: IEngine): LastWriteWinElementSetComponentDefinition<CompositeRoot> {
  const component = engine.getComponentOrNull('composite::root')

  if (component) {
    return component as LastWriteWinElementSetComponentDefinition<CompositeRoot>
  }

  return engine.defineComponent('composite::root', {
    id: Schemas.String,
    entities: Schemas.Array(
      Schemas.Map({
        src: Schemas.Entity,
        dest: Schemas.Entity
      })
    )
  })
}
