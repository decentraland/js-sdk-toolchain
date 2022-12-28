import { Entity } from '../engine/entity'

export type Uint32 = number
export enum WireMessageEnum {
  RESERVED = 0,

  // Component Operation
  PUT_COMPONENT = 1,
  DELETE_COMPONENT = 2,

  DELETE_ENTITY = 3,

  MAX_MESSAGE_TYPE
}

/**
 * @param length - Uint32 the length of all message (including the header)
 * @param type - define the function which handles the data
 */
export type WireMessageHeader = {
  length: Uint32
  type: Uint32
}

export const WIRE_MESSAGE_HEADER_LENGTH = 8

/**
 * @param entity - Uint32 number of the entity
 * @param componentId - Uint32 number of id
 * @param timestamp - Uint64 Lamport timestamp
 * @param data - Uint8[] data of component
 */
export type PutComponentMessageBody = {
  type: WireMessageEnum.PUT_COMPONENT
  entityId: Entity
  componentId: number
  timestamp: number
  data: Uint8Array
}

export type DeleteComponentMessageBody = {
  type: WireMessageEnum.DELETE_COMPONENT
  entityId: Entity
  componentId: number
  timestamp: number
}

/**
 * @param entity - Uint32 number of the entity
 */
export type DeleteEntityMessageBody = {
  type: WireMessageEnum.DELETE_ENTITY
  entityId: Entity
}

export type PutComponentMessage = WireMessageHeader & PutComponentMessageBody
export type DeleteComponentMessage = WireMessageHeader &
  DeleteComponentMessageBody
export type DeleteEntityMessage = WireMessageHeader & DeleteEntityMessageBody

export type Message =
  | PutComponentMessage
  | DeleteComponentMessage
  | DeleteEntityMessage
export type MessageBody =
  | PutComponentMessageBody
  | DeleteComponentMessageBody
  | DeleteEntityMessage
