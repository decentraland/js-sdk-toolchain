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

  MAX_MESSAGE_TYPE
}

/**
 * Min length = 8 bytes
 * All message length including
 * @param length - uint32 the length of all message (including the header)
 * @param type - define the function which handles the data
 * @internal
 */
export type CrdtMessageHeader = {
  length: uint32
  type: uint32
}

/**
 * @internal
 */
export const CRDT_MESSAGE_HEADER_LENGTH = 8

/**
 * Min. length = header (8 bytes) + 20 bytes = 28 bytes
 *
 * @param entity - uint32 number of the entity
 * @param componentId - uint32 number of id
 * @param timestamp - Uint64 Lamport timestamp
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

/**
 * @public
 */
export type DeleteComponentMessageBody = {
  type: CrdtMessageType.DELETE_COMPONENT
  entityId: Entity
  componentId: number
  timestamp: number
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
 * @internal
 */
export type PutComponentMessage = CrdtMessageHeader & PutComponentMessageBody
/**
 * @internal
 */
export type DeleteComponentMessage = CrdtMessageHeader & DeleteComponentMessageBody
/**
 * @internal
 */
export type DeleteEntityMessage = CrdtMessageHeader & DeleteEntityMessageBody

/**
 * @internal
 */
export type CrdtMessage = PutComponentMessage | DeleteComponentMessage | DeleteEntityMessage
/**
 * @public
 */
export type CrdtMessageBody = PutComponentMessageBody | DeleteComponentMessageBody | DeleteEntityMessageBody
