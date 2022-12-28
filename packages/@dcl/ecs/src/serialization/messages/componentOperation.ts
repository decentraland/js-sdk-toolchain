import { ComponentDefinition } from '../../engine/component'
import { Entity } from '../../engine/entity'
import { ByteBuffer } from '../ByteBuffer'
import { DeleteComponentMessage, PutComponentMessage, WireMessageEnum, WIRE_MESSAGE_HEADER_LENGTH } from '../types'
import WireMessage from '../wireMessage'

export namespace ComponentOperation {
  export const MESSAGE_HEADER_LENGTH = 20
  /**
   * Call this function for an optimal writing data passing the ByteBuffer
   *  already allocated
   */
  export function write(
    type: WireMessageEnum,
    entity: Entity,
    timestamp: number,
    componentDefinition: ComponentDefinition<unknown>,
    buf: ByteBuffer
  ) {
    // reserve the beginning
    const startMessageOffset = buf.incrementWriteOffset(
      WIRE_MESSAGE_HEADER_LENGTH + MESSAGE_HEADER_LENGTH
    )

    // write body
    if (type === WireMessageEnum.PUT_COMPONENT) {
      componentDefinition.writeToByteBuffer(entity, buf)
    }
    const messageLength = buf.size() - startMessageOffset

    // Write WireMessage header
    buf.setUint32(startMessageOffset, messageLength)
    buf.setUint32(startMessageOffset + 4, type)

    // Write ComponentOperation header
    buf.setUint32(startMessageOffset + 8, entity as number)
    buf.setUint32(startMessageOffset + 12, componentDefinition._id)
    buf.setUint64(startMessageOffset + 16, BigInt(timestamp))
    const newLocal = messageLength - MESSAGE_HEADER_LENGTH - WIRE_MESSAGE_HEADER_LENGTH
    buf.setUint32(
      startMessageOffset + 24,
      newLocal
    )
  }

  export function read(
    buf: ByteBuffer
  ): DeleteComponentMessage | PutComponentMessage | null {
    const header = WireMessage.readHeader(buf)

    if (!header) {
      return null
    }

    if (header.type === WireMessageEnum.PUT_COMPONENT) {
      return {
        ...header,
        entityId: buf.readUint32() as Entity,
        componentId: buf.readInt32(),
        timestamp: Number(buf.readUint64()),
        data: buf.readBuffer()
      }
    } else if (header.type === WireMessageEnum.DELETE_COMPONENT) {
      return {
        ...header,
        entityId: buf.readUint32() as Entity,
        componentId: buf.readInt32(),
        timestamp: Number(buf.readUint64())
      }
    } else {
      throw new Error('ComponentOperation tried to read other message type.')
    }
  }

  export function getType(
    component: ComponentDefinition<unknown>,
    entity: Entity
  ) {
    return component.has(entity) ? WireMessageEnum.PUT_COMPONENT : WireMessageEnum.DELETE_COMPONENT
  }
}
