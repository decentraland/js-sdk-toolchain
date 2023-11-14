import { Entity, uint32 } from '../../engine/entity'

/**
 * @public
 */
export enum CrdtMessageType {
  RESERVED = 0,

  // Component Operation
  PUT_COMPONENT = 1,
  DELETE_COMPONENT = 2,

  DELETE_ENTITY = 3,
  APPEND_VALUE = 4,
  // Network operations
  PUT_COMPONENT_NETWORK = 5,
  DELETE_COMPONENT_NETWORK = 6,
  DELETE_ENTITY_NETWORK = 7,

  MAX_MESSAGE_TYPE
}

/**
 * Min length = 8 bytes
 * All message length including
 * @param length - uint32 the length of all message (including the header)
 * @param type - define the function which handles the data
 * @public
 */
export type CrdtMessageHeader = {
  length: uint32
  type: uint32
}

/**
 * @public
 */
export const CRDT_MESSAGE_HEADER_LENGTH = 8

/**
 * Min. length = header (8 bytes) + 16 bytes = 24 bytes
 *
 * @param entity - Uint32 number of the entity
 * @param componentId - Uint32 number of id
 * @param timestamp - Uint32 Lamport timestamp
 * @param data - Uint8[] data of component => length(4 bytes) + block of bytes[0..length-1]
 * @public
 */
export type PutComponentMessageBody = {
  type: CrdtMessageType.PUT_COMPONENT
  entityId: Entity
  componentId: number
  timestamp: number
  data: Uint8Array
}

export type PutNetworkComponentMessageBody = Omit<PutComponentMessageBody, 'type'> & {
  type: CrdtMessageType.PUT_COMPONENT_NETWORK
  networkId: number
}

/**
 * Min. length = header (8 bytes) + 16 bytes = 24 bytes
 *
 * @param entity - Uint32 number of the entity
 * @param componentId - Uint32 number of id
 * @param timestamp - Uint32 timestamp
 * @param data - Uint8[] data of component => length(4 bytes) + block of bytes[0..length-1]
 * @public
 */
export type AppendValueMessageBody = {
  type: CrdtMessageType.APPEND_VALUE
  entityId: Entity
  componentId: number
  timestamp: number
  data: Uint8Array
}

/**
 * @param entity - Uint32 number of the entity
 * @param componentId - Uint32 number of id
 * @param timestamp - Uint32 Lamport timestamp
 * @public
 */
export type DeleteComponentMessageBody = {
  type: CrdtMessageType.DELETE_COMPONENT
  entityId: Entity
  componentId: number
  timestamp: number
}

/**
 * @param entity - Uint32 number of the entity
 * @param componentId - Uint32 number of id
 * @param timestamp - Uint32 Lamport timestamp
 * @param networkId - Uint32 user network id
 * @public
 */
export type DeleteComponentNetworkMessageBody = {
  type: CrdtMessageType.DELETE_COMPONENT_NETWORK
  entityId: Entity
  componentId: number
  timestamp: number
  networkId: number
}

/**
 * @param entity - uint32 number of the entity
 * @public
 */
export type DeleteEntityMessageBody = {
  type: CrdtMessageType.DELETE_ENTITY
  entityId: Entity
}

/**
 * @public
 */
export type DeleteEntityNetworkMessageBody = {
  type: CrdtMessageType.DELETE_ENTITY_NETWORK
  entityId: Entity
  networkId: number
}

/**
 * @public
 */
export type AppendValueMessage = CrdtMessageHeader & AppendValueMessageBody
/**
 * @public
 */
export type PutComponentMessage = CrdtMessageHeader & PutComponentMessageBody
/**
 * @public
 */
export type PutNetworkComponentMessage = CrdtMessageHeader & PutNetworkComponentMessageBody
/**
 * @public
 */
export type DeleteComponentMessage = CrdtMessageHeader & DeleteComponentMessageBody
/**
 * @public
 */
export type DeleteComponentNetworkMessage = CrdtMessageHeader & DeleteComponentNetworkMessageBody
/**
 * @public
 */
export type DeleteEntityMessage = CrdtMessageHeader & DeleteEntityMessageBody
/**
 * @public
 */
export type DeleteEntityNetworkMessage = CrdtMessageHeader & DeleteEntityNetworkMessageBody

/**
 * @public
 */
export type CrdtMessage =
  | PutComponentMessage
  | DeleteComponentMessage
  | AppendValueMessage
  | DeleteEntityMessage
  // Network messages
  | PutNetworkComponentMessage
  | DeleteComponentNetworkMessage
  | DeleteEntityNetworkMessage

/**
 * @public
 */
export type CrdtNetworkMessageBody =
  | PutNetworkComponentMessageBody
  | DeleteComponentNetworkMessageBody
  | DeleteEntityNetworkMessageBody

/**
 * @public
 */
export type CrdtMessageBody =
  | PutComponentMessageBody
  | DeleteComponentMessageBody
  | DeleteEntityMessageBody
  | AppendValueMessageBody
  | CrdtNetworkMessageBody

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
