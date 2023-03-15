import { Composite, ComponentData, CompositeComponent, CompositeComponent_DataEntry } from './proto/gen/composite.gen'

export { Composite, ComponentData, CompositeComponent, CompositeComponent_DataEntry }

/**
 * @public
 * @deprecated composite is not being supported so far, please do not use this feature
 */
export type CompositeProvider = {
  getCompositeOrNull: (id: string) => Composite | null
}
