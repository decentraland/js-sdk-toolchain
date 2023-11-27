import { CrdtMessageProtocol } from '../crdtMessageProtocol'
import { Entity } from '../../../engine/entity'
import { ByteBuffer } from '../../ByteBuffer'
import { CrdtMessageType, CRDT_MESSAGE_HEADER_LENGTH, DeleteComponentNetworkMessage } from '../types'

/**
 * @public
 */
export namespace DeleteComponentNetwork {
  export const MESSAGE_HEADER_LENGTH = 16

  /**
   * Write DeleteComponent message
   */
  export function write(entity: Entity, componentId: number, timestamp: number, networkId: number, buf: ByteBuffer) {
    // reserve the beginning
    const messageLength = CRDT_MESSAGE_HEADER_LENGTH + MESSAGE_HEADER_LENGTH
    const startMessageOffset = buf.incrementWriteOffset(messageLength)

    // Write CrdtMessage header
    buf.setUint32(startMessageOffset, messageLength)
    buf.setUint32(startMessageOffset + 4, CrdtMessageType.DELETE_COMPONENT_NETWORK)

    // Write ComponentOperation header
    buf.setUint32(startMessageOffset + 8, entity as number)
    buf.setUint32(startMessageOffset + 12, componentId)

    buf.setUint32(startMessageOffset + 16, timestamp)
    buf.setUint32(startMessageOffset + 20, networkId)
  }

  export function read(buf: ByteBuffer): DeleteComponentNetworkMessage | null {
    const header = CrdtMessageProtocol.readHeader(buf)

    if (!header) {
      return null
    }

    if (header.type !== CrdtMessageType.DELETE_COMPONENT_NETWORK) {
      throw new Error('DeleteComponentOperation tried to read another message type.')
    }

    return {
      ...header,
      entityId: buf.readUint32() as Entity,
      componentId: buf.readUint32(),
      timestamp: buf.readUint32(),
      networkId: buf.readUint32()
    }
  }
}
