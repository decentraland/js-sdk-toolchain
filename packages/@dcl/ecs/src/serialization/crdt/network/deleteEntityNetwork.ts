import { CrdtMessageProtocol } from '../crdtMessageProtocol'
import { Entity } from '../../../engine/entity'
import { ByteBuffer } from '../../ByteBuffer'
import { CrdtMessageType, CRDT_MESSAGE_HEADER_LENGTH, DeleteEntityNetworkMessage } from '../types'

/**
 * @public
 */
export namespace DeleteEntityNetwork {
  export const MESSAGE_HEADER_LENGTH = 8

  export function write(entity: Entity, networkId: number, buf: ByteBuffer) {
    // Write CrdtMessage header. The body is the entity and the network id, so
    // it is MESSAGE_HEADER_LENGTH long: declaring 4 described a message four
    // bytes shorter than the one being written, and anything that skips by the
    // declared length landed in the middle of it.
    buf.writeUint32(CRDT_MESSAGE_HEADER_LENGTH + MESSAGE_HEADER_LENGTH)
    buf.writeUint32(CrdtMessageType.DELETE_ENTITY_NETWORK)
    // body
    buf.writeUint32(entity)
    buf.writeUint32(networkId)
  }

  export function read(buf: ByteBuffer): DeleteEntityNetworkMessage | null {
    const header = CrdtMessageProtocol.readHeader(buf)
    if (!header) {
      return null
    }

    if (header.type !== CrdtMessageType.DELETE_ENTITY_NETWORK) {
      throw new Error('DeleteEntityNetwork tried to read another message type.')
    }

    return {
      ...header,
      entityId: buf.readUint32() as Entity,
      networkId: buf.readUint32()
    }
  }
}
