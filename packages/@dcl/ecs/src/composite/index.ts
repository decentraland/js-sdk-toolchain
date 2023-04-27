import { IEngine } from '../engine'
import { CompositeRootType, getCompositeRootComponent } from './components'
import {
  CompositeProvider,
  CompositeResource,
  EntityMappingMode,
  InstanceCompositeOptions,
  instanceComposite
} from './instance'
import { resolveComposite } from './path'
import type { ComponentData, CompositeComponent, CompositeComponent_DataEntry } from './proto/gen/composite.gen'
import { CompositeDefinition } from './proto/gen/composite.gen'
export type {
  CompositeDefinition,
  ComponentData,
  CompositeComponent,
  CompositeComponent_DataEntry,
  InstanceCompositeOptions,
  CompositeProvider,
  CompositeRootType,
  CompositeResource
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
  export type Definition = CompositeDefinition

  /** @public */
  export type Resource = CompositeResource

  /** @public */
  export type Provider = CompositeProvider

  /** @public */
  export function fromJson(object: any): Composite.Definition {
    return CompositeDefinition.fromJSON(object)
  }

  /** @public */
  export function fromBinary(buffer: Uint8Array): Composite.Definition {
    return CompositeDefinition.decode(buffer)
  }

  /** @public */
  export function toJson(composite: Composite.Definition): any {
    return CompositeDefinition.toJSON(composite)
  }

  /** @public */
  export function toBinary(composite: Composite.Definition): Uint8Array {
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
    compositeData: Composite.Resource,
    compositeProvider: CompositeProvider,
    options: InstanceCompositeOptions = {}
  ) {
    instanceComposite(engine, compositeData, compositeProvider, options)
  }

  /**
   * Resolve and normalize a composite path
   * @param src - the source path
   * @param cwd - the directory from the resolve should start to resolve
   *
   * @returns the absolute resolved path without slash at the beginning
   * @public
   */
  /*#__PURE__*/ export function resolveAndNormalizePath(src: string, cwd: string = '/') {
    return resolveComposite(src, cwd)
  }
}
