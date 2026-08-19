import { ISchema } from '../schemas'
import { ByteBuffer } from '../serialization/ByteBuffer'
import {
  CrdtMessageBody,
  DeleteComponentMessageBody,
  ProcessMessageResultType,
  PutComponentMessageBody
} from '../serialization/crdt'
import { Entity } from './entity'
import { DeepReadonly, DeepReadonlySet } from './readonly'

/**
 * Component types are used to pick the wire protocol and the conflict resolution algorithm
 * @public
 */
export const enum ComponentType {
  LastWriteWinElementSet = 0,
  GrowOnlyValueSet = 1
}

/**
 * A conflict resolution message is the response to an outdated or invalid state
 * in the CRDT.
 * @public
 */
export type ConflictResolutionMessage = PutComponentMessageBody | DeleteComponentMessageBody

/**
 * @public
 */
export interface BaseComponent<T> {
  readonly componentId: number
  readonly componentName: string
  readonly componentType: ComponentType
  readonly schema: ISchema<T>

  // <SYSTEM INTERFACE METHODS>

  /**
   * This function receives a CRDT update and returns a touple with a "conflict
   * resoluton" message, in case of the sender being updated or null in case of noop/accepted
   * change. The second element of the touple is the modified/changed/deleted value.
   * @public
   */
  updateFromCrdt(body: CrdtMessageBody): [null | ConflictResolutionMessage, T | undefined]
  /**
   * @internal
   */
  __forceUpdateFromCrdt(body: CrdtMessageBody): [null, T | undefined]
  /**
   * @internal
   */
  __dry_run_updateFromCrdt(body: CrdtMessageBody): ProcessMessageResultType

  /**
   * This function returns an iterable with all the CRDT updates that need to be
   * broadcasted to other actors in the system. After returning, this function
   * clears the internal dirty state. Updates are produced only once.
   * @public
   */
  getCrdtUpdates(): Iterable<CrdtMessageBody>

  /**
   * This function writes the whole state of the component into a ByteBuffer
   * @public
   */
  dumpCrdtStateToBuffer(buffer: ByteBuffer, filterEntity?: (entity: Entity) => boolean): void

  /**
   * @public
   * Marks the entity as deleted and signals it cannot be used ever again. It must
   * clear the component internal state, produces a synchronization message to remove
   * the component from the entity.
   * @param entity - Entity ID that was deleted.
   */
  entityDeleted(entity: Entity, markAsDirty: boolean): void

  // </ SYSTEM INTERFACE METHODS>

  // <USER INTERFACE>
  /**
   * Get if the entity has this component
   * @param entity - entity to test
   */
  has(entity: Entity): boolean

  /**
   * Get the readonly component of the entity (to mutate it, use getMutable instead),
   * throws an error if the entity doesn't have the component.
   * @param entity - Entity that will be used to get the component
   * @returns
   */
  get(entity: Entity): any
  // </ USER INTERFACE>

  // Unstable and internal APIs

  /**
   * @internal Use engine.getEntitiesWith(Component) instead.
   * Get the iterator to every entity has the component
   */
  iterator(): Iterable<[Entity, any]>

  /**
   * @internal
   */
  dirtyIterator(): Iterable<Entity>
  /**
   *
   * @internal
   */
  __onChangeCallbacks(entity: Entity, value: T): void

  /**
   * @public
   * Triggers the callback if the entity has changed on the last tick.
   * If the value is undefined, the component was deleted.
   */
  onChange(entity: Entity, cb: (value: T | undefined) => void): void

  /**
   * @public
   *
   */
  validateBeforeChange(entity: Entity, cb: ValidateCallback<T>): void
  validateBeforeChange(cb: ValidateCallback<T>): void
  /**
   * @internal
   */
  __run_validateBeforeChange(entity: Entity, newValue: T | undefined, senderAddress: string, createdBy: string): boolean

  /**
   * Get the CRDT state for an entity (serialized data and timestamp)
   * @param entity - Entity to get the CRDT state for
   * @returns Object with serialized data and timestamp, or null if entity doesn't have the component
   * @public
   */
  getCrdtState(entity: Entity): { data: Uint8Array; timestamp: number } | null
}

/**
 * Internal component interface that exposes all internal methods for SDK use
 * This is not exposed to users, only for internal SDK operations
 */
export interface InternalBaseComponent<T> extends BaseComponent<T> {
  // This interface inherits all methods from BaseComponent but makes the internal methods
  // more accessible for SDK internal use. The main difference is that this interface
  // is marked as @internal and can be used within the SDK package without exposing
  // internal methods to end users.

  // All the internal methods are already available through inheritance:
  // - __forceUpdateFromCrdt
  // - __dry_run_updateFromCrdt
  // - __onChangeCallbacks
  // - __run_validateBeforeChange
  // - dirtyIterator
  // - iterator

  /**
   * @public
   * Force update component state regardless of timestamp - used for server authoritative messages
   */
  __forceUpdateFromCrdt(body: CrdtMessageBody): [null, T | undefined]

  /**
   * @public
   * Dry run update to check if a CRDT message would be accepted without actually applying it
   */
  __dry_run_updateFromCrdt(body: CrdtMessageBody): ProcessMessageResultType

  /**
   * @public
   * Get the iterator to every entity has the component
   */
  iterator(): Iterable<[Entity, any]>

  /**
   * @public
   */
  dirtyIterator(): Iterable<Entity>

  /**
   * @public
   */
  __onChangeCallbacks(entity: Entity, value: T): void

  /**
   * @public
   */
  __run_validateBeforeChange(entity: Entity, newValue: T | undefined, senderAddress: string, createdBy: string): boolean
}

export type ValidateCallback<T> = (value: {
  entity: Entity // The entity being validated
  currentValue: T | undefined // Current value of the component (undefined if component doesn't exist)
  newValue: T | undefined // New value being set (undefined if component is being deleted)
  senderAddress: string // Peer address/sender of the change
  createdBy: string // Address of the user who created the change
}) => boolean

/**
 * @public
 */
export interface LastWriteWinElementSetComponentDefinition<T> extends BaseComponent<T> {
  readonly componentType: ComponentType.LastWriteWinElementSet

  // <USER INTERFACE METHODS>
  /**
   * Get the readonly component of the entity (to mutate it, use getMutable instead),
   * throws an error if the entity doesn't have the component.
   * @param entity - Entity that will be used to get the component
   * @returns
   */
  get(entity: Entity): DeepReadonly<T>

  /**
   * Get the readonly component of the entity (to mutate it, use getMutable instead), or null if the entity doesn't have the component.
   * @param entity - Entity that will be used to try to get the component
   */
  getOrNull(entity: Entity): DeepReadonly<T> | null

  /**
   * Add the current component to an entity, throw an error if the component already exists (use `createOrReplace` instead).
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity that will be used to create the component
   * @param val - The initial value
   */
  create(entity: Entity, val?: T): T

  /**
   * Add the current component to an entity or replace the content if the entity already has the component
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity that will be used to create or replace the component
   * @param val - The initial or new value
   */
  createOrReplace(entity: Entity, val?: T): T

  /**
   * @internal
   * Delete the current component to an entity, return null if the entity doesn't have the current component.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to delete the component from
   * @param markAsDirty - defaults to true
   */
  deleteFrom(entity: Entity, markAsDirty?: boolean): T | null

  /**
   * @public
   * Delete the current component to an entity, return null if the entity doesn't have the current component.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to delete the component from
   */
  deleteFrom(entity: Entity): T | null

  /**
   * Get the mutable component of the entity, throw an error if the entity doesn't have the component.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to get the component from
   */
  getMutable(entity: Entity): T

  /**
   * Get the mutable component of the entity, return null if the entity doesn't have the component.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to get the component from
   */
  getMutableOrNull(entity: Entity): T | null

  /**
   * Get the mutable component of the entity. If the entity doesn't have the component, it's created.
   * - Internal comment: This method adds the &lt;entity,component&gt; to the list to be reviewed next frame
   * @param entity - Entity to get the component from
   * @param val - The initial value if it doesn't exist
   */
  getOrCreateMutable(entity: Entity, initialValue?: T): T
}
/**
 * @public
 */
export type ReadOnlyLastWriteWinElementSetComponentDefinition<T> = Omit<
  LastWriteWinElementSetComponentDefinition<T>,
  'create' | 'createOrReplace' | 'deleteFrom' | 'getMutable' | 'getMutableOrNull' | 'getOrCreateMutable'
>

/**
 * @public
 */
export interface GrowOnlyValueSetComponentDefinition<T> extends BaseComponent<T> {
  readonly componentType: ComponentType.GrowOnlyValueSet

  /**
   * Appends an element to the set.
   * @param entity - Entity that will host the value
   * @param val - The final value. The Set will freeze the value, it won't be editable from
   * the script.
   */
  addValue(entity: Entity, val: DeepReadonly<T>): DeepReadonlySet<T>

  /**
   * Get the readonly component of the entity (to mutate it, use getMutable instead),
   * throws an error if the entity doesn't have the component.
   * @param entity - Entity that will be used to get the component
   * @returns
   */
  get(entity: Entity): DeepReadonlySet<T>

  /**
   * Get the CRDT state for an entity (serialized data and timestamp)
   * @param entity - Entity to get the CRDT state for
   * @returns Object with serialized data and timestamp, or null if entity doesn't have the component
   * @internal
   */
  getCrdtState(entity: Entity): { data: Uint8Array; timestamp: number } | null
}

/**
 * @public
 */
export type ReadOnlyGrowOnlyValueSetComponentDefinition<T> = Omit<GrowOnlyValueSetComponentDefinition<T>, 'addValue'>

/**
 * @public
 */
export type ComponentDefinition<T> =
  | LastWriteWinElementSetComponentDefinition<T>
  | GrowOnlyValueSetComponentDefinition<T>
  | ReadOnlyGrowOnlyValueSetComponentDefinition<T>
  | ReadOnlyLastWriteWinElementSetComponentDefinition<T>
