import { IEngine } from '../engine'
import { CompositeRootType, getCompositeRootComponent } from './components'
import { CompositeProvider, EntityMappingMode, instanceComposite, InstanceCompositeOptions } from './instance'
import type { ComponentData, CompositeComponent, CompositeComponent_DataEntry } from './proto/gen/composite.gen'
import { CompositeDefinition } from './proto/gen/composite.gen'
export type {
  CompositeDefinition,
  ComponentData,
  CompositeComponent,
  CompositeComponent_DataEntry,
  InstanceCompositeOptions,
  CompositeProvider,
  CompositeRootType
}
export { EntityMappingMode }
export { getCompositeRootComponent }

/**
 * @public
 * @deprecated composite is not being supported so far, please do not use this feature
 */
export type Composite = CompositeDefinition

/**
 * @public
 * @deprecated composite is not being supported so far, please do not use this feature
 */
export namespace Composite {
  /** @public */
  export type Type = CompositeDefinition

  /** @public */
  export type Provider = CompositeProvider

  /** @public */
  export function fromJson(object: any): Composite.Type {
    return CompositeDefinition.fromJSON(object)
  }

  /** @public */
  export function fromBinary(buffer: Uint8Array): Composite.Type {
    return CompositeDefinition.decode(buffer)
  }

  /** @public */
  export function toJson(composite: Composite.Type): any {
    return CompositeDefinition.toJSON(composite)
  }

  /** @public */
  export function toBinary(composite: Composite.Type): Uint8Array {
    return CompositeDefinition.encode(composite).finish()
  }

  /**
   * Instance a composite and returns its root entity
   * @param compositeData - state serialized by the CRDT protocol
   * @param getNextAvailableEntity - function that gives unused entities
   * @param rootEntity - (optional) suggested mapped rootEntity for the composite
   *
   * @public
   */
  /*#__PURE__*/ export function instance(
    engine: IEngine,
    compositeData: Composite.Type,
    compositeProvider: CompositeProvider,
    options: InstanceCompositeOptions = {}
  ) {
    instanceComposite(engine, compositeData, compositeProvider, options)
  }
}
