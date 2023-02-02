import CrdtMessageProtocol from '.'
import { Entity } from '../../engine/entity'
import { ByteBuffer } from '../ByteBuffer'
import { CrdtMessageType, CRDT_MESSAGE_HEADER_LENGTH, DeleteComponentMessage } from './types'

export namespace DeleteComponent {
  // TODO: change timestamp to 32 bit and remove buffer length (-8 bytes)
  export const MESSAGE_HEADER_LENGTH = 20

  /**
   * Write DeleteComponent message
   */
  export function write(entity: Entity, componentId: number, timestamp: number, buf: ByteBuffer) {
    // reserve the beginning
    const messageLength = CRDT_MESSAGE_HEADER_LENGTH + MESSAGE_HEADER_LENGTH
    const startMessageOffset = buf.incrementWriteOffset(messageLength)

    // Write CrdtMessage header
    buf.setUint32(startMessageOffset, messageLength)
    buf.setUint32(startMessageOffset + 4, CrdtMessageType.DELETE_COMPONENT)

    // Write ComponentOperation header
    buf.setUint32(startMessageOffset + 8, entity as number)
    buf.setUint32(startMessageOffset + 12, componentId)

    // TODO: change timestamp to 32bit (-4 bytes)
    buf.setUint64(startMessageOffset + 16, BigInt(timestamp))

    // TODO: remove buffer length (-4 bytes)
    buf.setUint32(startMessageOffset + 24, 0)
  }

  export function read(buf: ByteBuffer): DeleteComponentMessage | null {
    const header = CrdtMessageProtocol.readHeader(buf)

    if (!header) {
      return null
    }

    if (header.type !== CrdtMessageType.DELETE_COMPONENT) {
      throw new Error('DeleteComponentOperation tried to read another message type.')
    }

    const msg = {
      ...header,
      entityId: buf.readUint32() as Entity,
      componentId: buf.readUint32(),
      timestamp: Number(buf.readUint64())
    }

    // TODO: remove buffer length
    buf.incrementReadOffset(4)
    return msg
  }
}
