import { Entity } from '../../engine/entity'

export type Uint32 = number

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
 * @param length - Uint32 the length of all message (including the header)
 * @param type - define the function which handles the data
 */
export type CrdtMessageHeader = {
  length: Uint32
  type: Uint32
}

export const CRDT_MESSAGE_HEADER_LENGTH = 8

/**
 * Min. length = header (8 bytes) + 20 bytes = 28 bytes
 *
 * @param entity - Uint32 number of the entity
 * @param componentId - Uint32 number of id
 * @param timestamp - Uint64 Lamport timestamp
 * @param data - Uint8[] data of component => length(4 bytes) + block of bytes[0..length-1]
 */
export type PutComponentMessageBody = {
  type: CrdtMessageType.PUT_COMPONENT
  entityId: Entity
  componentId: number
  timestamp: number
  data: Uint8Array
}

export type DeleteComponentMessageBody = {
  type: CrdtMessageType.DELETE_COMPONENT
  entityId: Entity
  componentId: number
  timestamp: number
}

/**
 * @param entity - Uint32 number of the entity
 */
export type DeleteEntityMessageBody = {
  type: CrdtMessageType.DELETE_ENTITY
  entityId: Entity
}

export type PutComponentMessage = CrdtMessageHeader & PutComponentMessageBody
export type DeleteComponentMessage = CrdtMessageHeader &
  DeleteComponentMessageBody
export type DeleteEntityMessage = CrdtMessageHeader & DeleteEntityMessageBody

export type CrdtMessage =
  | PutComponentMessage
  | DeleteComponentMessage
  | DeleteEntityMessage
export type CrdtMessageBody =
  | PutComponentMessageBody
  | DeleteComponentMessageBody
  | DeleteEntityMessage
