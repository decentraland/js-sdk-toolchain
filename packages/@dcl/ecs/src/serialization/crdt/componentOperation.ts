import { ComponentDefinition } from '../../engine/component'
import { Entity } from '../../engine/entity'
import { ByteBuffer } from '../ByteBuffer'
import WireMessage from '../wireMessage'

export namespace ComponentOperation {
  /**
   * @param entity - Uint32 number of the entity
   * @param componentId - Uint32 number of id
   * @param timestamp - Uint64 Lamport timestamp
   * @param data - Uint8[] data of component
   */
  export type IPutComponent = {
    entity: Entity
    componentId: number
    timestamp: number
    data: Uint8Array
  }
  export type IDeleteComponent = {
    entity: Entity
    componentId: number
    timestamp: number
    data?: undefined
  }

  export const MESSAGE_HEADER_LENGTH = 20
  /**
   * Call this function for an optimal writing data passing the ByteBuffer
   *  already allocated
   */
  export function write(
    type: WireMessage.Enum,
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
    if (type === WireMessage.Enum.PUT_COMPONENT) {
      componentDefinition.writeToByteBuffer(entity, buf)
    }
    const messageLength = buf.size() - startMessageOffset

    // Write WireMessage header
    buf.setUint32(startMessageOffset, messageLength)
    buf.setUint32(startMessageOffset + 4, type)

    // Write ComponentOperation header
    buf.setUint32(startMessageOffset + 8, entity)
    buf.setUint32(startMessageOffset + 12, componentDefinition._id)
    buf.setUint64(startMessageOffset + 16, BigInt(timestamp))
    buf.setUint32(
      startMessageOffset + 24,
      messageLength - MESSAGE_HEADER_LENGTH - WireMessage.HEADER_LENGTH
    )
  }

  export function read(
    buf: ByteBuffer
  ): (WireMessage.Header & (IPutComponent | IDeleteComponent)) | null {
    const header = WireMessage.readHeader(buf)

    if (!header) {
      return null
    }

    const common = {
      ...header,
      entity: buf.readUint32() as Entity,
      componentId: buf.readInt32(),
      timestamp: Number(buf.readUint64())
    }

    if (header.type === WireMessage.Enum.DELETE_COMPONENT) {
      return common
    }

    return {
      ...common,
      data: buf.readBuffer()
    }
  }
}
