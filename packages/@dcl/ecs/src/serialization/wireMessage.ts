/**
 * The wire message is the top-level message that can be packed
 *  inside it can contain a data with another structure or protocol
 *
 * Each wire message has three primitive property that it'll never change
 *   ---> length        uint32 (message size up to 4,294,967,295)
 *   ---> version       uint32 (for now just a number which is zero)
 *   ---> message type  uint32
 * The length indicates how many bytes are above self, the version in
 * combination with message type defines the set of handlers that will be
 * available to process the message
 *
 */

import { ByteBuffer } from './ByteBuffer'
import { WireMessageEnum, WireMessageHeader, WIRE_MESSAGE_HEADER_LENGTH } from './types'

export namespace WireMessage {
  /**
   * Validate if the message incoming is completed
   * @param buf - ByteBuffer
   */
  export function validate(buf: ByteBuffer) {
    const rem = buf.remainingBytes()
    if (rem < WIRE_MESSAGE_HEADER_LENGTH) {
      return false
    }

    const messageLength = buf.getUint32(buf.currentReadOffset())
    if (rem < messageLength) {
      return false
    }

    return true
  }

  export function readHeader(buf: ByteBuffer): WireMessageHeader | null {
    if (!validate(buf)) {
      return null
    }

    return {
      length: buf.readUint32(),
      type: buf.readUint32() as WireMessageEnum
    }
  }

  export function getHeader(buf: ByteBuffer): WireMessageHeader | null {
    const rem = buf.remainingBytes()
    if (rem < WIRE_MESSAGE_HEADER_LENGTH) {
      return null
    }

    const messageLength = buf.getUint32(buf.currentReadOffset())
    if (rem < messageLength) {
      return null
    }

    return {
      length: messageLength,
      type: buf.getUint32(buf.currentReadOffset() + 4) as WireMessageEnum
    }
  }
}

export default WireMessage
