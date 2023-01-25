import { OptimizedGrowonlySet } from './gset'

/**
 * CRDT entity identifier: it use to be a compound number
 */
export type EntityID = number & { __entity_type: '' }

/**
 * CRDT Message Type
 */
export enum CRDTMessageType {
  CRDTMT_PutComponentData = 1,
  CRDTMT_DeleteEntity
}

/**
 * Struct of the message that's being transfered between clients.
 * @public
 */
export type ComponentDataMessage<T = unknown> = {
  type: CRDTMessageType.CRDTMT_PutComponentData
  componentId: number
  entityId: number
  timestamp: number
  data: T | null
}

/**
 * Struct of the message that's being transfered between clients.
 * @public
 */
export type DeleteEntityMessage = {
  type: CRDTMessageType.CRDTMT_DeleteEntity
  entityId: number
}

export type CRDTMessage<T = unknown> = ComponentDataMessage<T> | DeleteEntityMessage

/**
 * Payload that its being stored in the state.
 * @public
 */
export type Payload<T = unknown> = {
  timestamp: number
  data: T | null
}

/**
 * Local state
 * @public
 */
export type State<T = unknown> = {
  components: Map<number, Map<number, Payload<T> | null>>
  deletedEntities: OptimizedGrowonlySet
}

export enum ProcessMessageResultType {
  /**
   * Typical message and new state set.
   * @state CHANGE
   * @reason Incoming message has a timestamp greater
   */
  StateUpdatedTimestamp = 1,

  /**
   * Typical message when it is considered old.
   * @state it does NOT CHANGE.
   * @reason incoming message has a timestamp lower.
   */
  StateOutdatedTimestamp = 2,

  /**
   * Weird message, same timestamp and data.
   * @state it does NOT CHANGE.
   * @reason consistent state between peers.
   */
  NoChanges = 3,

  /**
   * Less but typical message, same timestamp, resolution by data.
   * @state it does NOT CHANGE.
   * @reason incoming message has a LOWER data.
   */
  StateOutdatedData = 4,

  /**
   * Less but typical message, same timestamp, resolution by data.
   * @state CHANGE.
   * @reason incoming message has a GREATER data.
   */
  StateUpdatedData = 5,

  /**
   * Entity was previously deleted.
   * @state it does NOT CHANGE.
   * @reason The message is considered old.
   */
  EntityWasDeleted = 6,

  /**
   * Entity should be deleted.
   * @state CHANGE.
   * @reason the state is storing old entities
   */
  EntityDeleted = 7
}

/**
 * CRDT return type
 * @public
 */
export type CRDT<T = unknown> = {
  /**
   * Create an event for the specified pair of <componentId, entityId>
   * and store the new data and lamport timestmap incremented by one in the state.
   *
   * @param componentId
   * @param entityId
   * @param data
   *
   * @returns
   */
  createComponentDataEvent(componentId: number, entityId: number, data: T | null): ComponentDataMessage<T> | null

  /**
   *
   * @param entityId
   */
  createDeleteEntityEvent(entityId: number): DeleteEntityMessage

  /**   
   * Process the received message only if the lamport number recieved is higher
   * than the stored one. If its lower, we spread it to the network to correct the peer.
   * If they are equal, the bigger raw data wins.
   * 
   * @public
   * @param message 

   * @returns 
   */
  processMessage(message: CRDTMessage<T>): ProcessMessageResultType

  // @internal
  getState(): State<T>
  getElementSetState(componentId: number, entityId: number): Payload<T> | null
}

// we receive LWW, v=6, we have v=5 => we receive with delay the deleteEntity(v=5)
//   => we should generate the deleteEntity message effects internally with deleteEntity(v=5),
//       but don't resend the deleteEntity
//          - (CRDT) addDeletedEntitySet v=5 (with crdt state cleaning) and then LWW v=6
//          - (engine) engine.deleteEntity v=5

// we receive LWW, v=7, we have v=5 => we receive with delay the deleteEntity(v=5), deleteEntity(v=6), ..., N
//   => we should generate the deleteEntity message effects internally with deleteEntity(v=5),
//       but don't resend the deleteEntity
//          - (CRDT) addDeletedEntitySet v=5 (with crdt state cleaning) and then LWW v=6
//          - (engine) engine.deleteEntity v=5

// msg delete entity: it only should be sent by deleter
//
