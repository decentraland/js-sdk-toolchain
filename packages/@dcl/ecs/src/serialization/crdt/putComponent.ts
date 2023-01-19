import CrdtMessageProtocol from '.'
import { ComponentDefinition } from '../../engine/component'
import { Entity } from '../../engine/entity'
import { ByteBuffer } from '../ByteBuffer'
import {
  CrdtMessageType,
  CRDT_MESSAGE_HEADER_LENGTH,
  PutComponentMessage
} from './types'

export namespace PutComponentOperation {
  export const MESSAGE_HEADER_LENGTH = 20

  /**
   * Call this function for an optimal writing data passing the ByteBuffer
   *  already allocated
   */
  export function write(
    entity: Entity,
    timestamp: number,
    componentDefinition: ComponentDefinition<unknown>,
    buf: ByteBuffer
  ) {
    // reserve the beginning
    const startMessageOffset = buf.incrementWriteOffset(
      CRDT_MESSAGE_HEADER_LENGTH + MESSAGE_HEADER_LENGTH
    )

    // write body
    componentDefinition.writeToByteBuffer(entity, buf)
    const messageLength = buf.currentWriteOffset() - startMessageOffset

    // Write CrdtMessage header
    buf.setUint32(startMessageOffset, messageLength)
    buf.setUint32(startMessageOffset + 4, CrdtMessageType.PUT_COMPONENT)

    // Write ComponentOperation header
    buf.setUint32(startMessageOffset + 8, entity as number)
    buf.setUint32(startMessageOffset + 12, componentDefinition.componentId)
    buf.setUint64(startMessageOffset + 16, BigInt(timestamp))
    const newLocal =
      messageLength - MESSAGE_HEADER_LENGTH - CRDT_MESSAGE_HEADER_LENGTH
    buf.setUint32(startMessageOffset + 24, newLocal)
  }

  export function read(buf: ByteBuffer): PutComponentMessage | null {
    const header = CrdtMessageProtocol.readHeader(buf)

    if (!header) {
      return null
    }

    if (header.type !== CrdtMessageType.PUT_COMPONENT) {
      throw new Error(
        'PutComponentOperation tried to read another message type.'
      )
    }

    return {
      ...header,
      entityId: buf.readUint32() as Entity,
      componentId: buf.readUint32(),
      timestamp: Number(buf.readUint64()),
      data: buf.readBuffer()
    }
  }
}
