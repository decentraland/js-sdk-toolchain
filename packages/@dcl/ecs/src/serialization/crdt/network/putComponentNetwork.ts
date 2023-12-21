import { CrdtMessageProtocol } from '../crdtMessageProtocol'
import { Entity } from '../../../engine/entity'
import { ByteBuffer } from '../../ByteBuffer'
import { CrdtMessageType, CRDT_MESSAGE_HEADER_LENGTH, PutNetworkComponentMessage } from '../types'

/**
 * @public
 */
export namespace PutNetworkComponentOperation {
  export const MESSAGE_HEADER_LENGTH = 20

  /**
   * Call this function for an optimal writing data passing the ByteBuffer
   *  already allocated
   */
  export function write(
    entity: Entity,
    timestamp: number,
    componentId: number,
    networkId: number,
    data: Uint8Array,
    buf: ByteBuffer
  ) {
    // reserve the beginning
    const startMessageOffset = buf.incrementWriteOffset(CRDT_MESSAGE_HEADER_LENGTH + MESSAGE_HEADER_LENGTH)

    // write body
    buf.writeBuffer(data, false)
    const messageLength = buf.currentWriteOffset() - startMessageOffset

    // Write CrdtMessage header
    buf.setUint32(startMessageOffset, messageLength)
    buf.setUint32(startMessageOffset + 4, CrdtMessageType.PUT_COMPONENT_NETWORK)

    // Write ComponentOperation header
    buf.setUint32(startMessageOffset + 8, entity as number)
    buf.setUint32(startMessageOffset + 12, componentId)
    buf.setUint32(startMessageOffset + 16, timestamp)
    buf.setUint32(startMessageOffset + 20, networkId)
    const dataLength = messageLength - MESSAGE_HEADER_LENGTH - CRDT_MESSAGE_HEADER_LENGTH
    buf.setUint32(startMessageOffset + 24, dataLength)
  }

  export function read(buf: ByteBuffer): PutNetworkComponentMessage | null {
    const header = CrdtMessageProtocol.readHeader(buf)

    if (!header) {
      return null
    }
    if (header.type !== CrdtMessageType.PUT_COMPONENT_NETWORK) {
      throw new Error('PutComponentNetworkOperation tried to read another message type.')
    }

    return {
      ...header,
      entityId: buf.readUint32() as Entity,
      componentId: buf.readUint32(),
      timestamp: buf.readUint32(),
      networkId: buf.readUint32(),
      data: buf.readBuffer()
    }
  }
}
