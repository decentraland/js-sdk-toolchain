import { ComponentDefinition } from '../../engine/component'
import { Entity } from '../../engine/entity'
import { ByteBuffer } from '../ByteBuffer'
import WireMessage from '../wireMessage'

export namespace PutComponentOperation {
  /**
   * @param entity - Uint32 number of the entity
   * @param componentId - Uint32 number of id
   * @param timestamp - Uint64 Lamport timestamp
   * @param data - Uint8[] data of component
   */
  export type Type = {
    entity: Entity
    componentId: number
    timestamp: number
    data: Uint8Array
  }

  export const MESSAGE_HEADER_LENGTH = 20
  /**
   * Call this function for an optimal writing data passing the ByteBuffer
   *  already allocated
   */
  export function write(
    entity: Entity,
    timestamp: number,
    componentDefinition: ComponentDefinition,
    buf: ByteBuffer
  ) {
    // reserve the beginning
    const startMessageOffset = buf.incrementWriteOffset(
      WireMessage.HEADER_LENGTH + MESSAGE_HEADER_LENGTH
    )

    // write body
    componentDefinition.writeToByteBuffer(entity, buf)
    const messageLength = buf.size() - startMessageOffset

    // Write WireMessage header
    buf.setUint32(startMessageOffset, messageLength)
    buf.setUint32(startMessageOffset + 4, WireMessage.Enum.PUT_COMPONENT)

    // Write ComponentOperation header
    buf.setUint32(startMessageOffset + 8, entity)
    buf.setUint32(startMessageOffset + 12, componentDefinition._id)
    buf.setUint64(startMessageOffset + 16, BigInt(timestamp))
    buf.setUint32(
      startMessageOffset + 24,
      messageLength - MESSAGE_HEADER_LENGTH - WireMessage.HEADER_LENGTH
    )
  }

  export function read(buf: ByteBuffer): (WireMessage.Header & Type) | null {
    const header = WireMessage.readHeader(buf)

    if (!header) {
      return null
    }

    return {
      ...header,
      entity: buf.readUint32() as Entity,
      componentId: buf.readInt32(),
      timestamp: Number(buf.readUint64()),
      data: buf.readBuffer()
    }
  }
}
