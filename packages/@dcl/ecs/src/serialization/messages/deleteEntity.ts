import { Entity } from '../../engine/entity'
import { ByteBuffer } from '../ByteBuffer'
import { DeleteEntityMessage } from '../types'
import WireMessage from '../wireMessage'

export namespace DeleteEntity {
  export const MESSAGE_HEADER_LENGTH = 4
  /**
   * Call this function for an optimal writing data passing the ByteBuffer
   *  already allocated
   */
  export function write(entity: Entity, buf: ByteBuffer) {
    buf.writeUint32(entity)
  }

  export function read(buf: ByteBuffer): DeleteEntityMessage | null {
    const header = WireMessage.readHeader(buf)

    if (!header) {
      return null
    }

    return {
      ...header,
      entityId: buf.readUint32() as Entity
    }
  }
}
