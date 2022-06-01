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

type Uint32 = number

export namespace WireMessage {
  export enum Enum {
    RESERVED = 0,

    // Component Operation
    PUT_COMPONENT = 1,
    DELETE_COMPONENT = 2,

    // TODO: ?
    MAX_MESSAGE_TYPE
  }

  /**
   * @param length - Uint32 the length of all message (including the header)
   * @param type - define the function which handles the data
   */
  export type Header = {
    length: Uint32
    type: Uint32
  }

  export const HEADER_LENGTH = 8
  /**
   * Validate if the message incoming is completed
   * @param buf
   */
  export function validate(buf: ByteBuffer) {
    const rem = buf.remainingBytes()
    if (rem < HEADER_LENGTH) {
      return false
    }

    const messageLength = buf.getUint32(buf.currentReadOffset())
    if (rem < messageLength) {
      return false
    }

    return true
  }

  export function readHeader(buf: ByteBuffer): Header | null {
    if (!validate(buf)) {
      return null
    }

    return {
      length: buf.readUint32(),
      type: buf.readUint32() as Enum
    }
  }
}

export default WireMessage
