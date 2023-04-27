import { Entity } from '../engine'
import { IEngine, LastWriteWinElementSetComponentDefinition } from '../engine/types'
import { Schemas } from '../schemas'

/**
 * @public
 * @deprecated composite is not being supported so far, please do not use this feature
 */
export type CompositeRootType = {
  src: string
  entities: {
    src: Entity
    dest: Entity
  }[]
}

/**
 * @public
 * @deprecated composite is not being supported so far, please do not use this feature
 */
export function getCompositeRootComponent(
  engine: IEngine
): LastWriteWinElementSetComponentDefinition<CompositeRootType> {
  const component = engine.getComponentOrNull('composite::root')

  if (component) {
    return component as LastWriteWinElementSetComponentDefinition<CompositeRootType>
  }

  return engine.defineComponent('composite::root', {
    src: Schemas.String,
    entities: Schemas.Array(
      Schemas.Map({
        src: Schemas.Entity,
        dest: Schemas.Entity
      })
    )
  })
}
