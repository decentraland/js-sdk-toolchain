import { CrdtMessageProtocol } from './crdtMessageProtocol'
import { ByteBuffer } from '../ByteBuffer'
import { CrdtMessageType, CrdtMessage, CrdtMessageHeader, CRDT_MESSAGE_HEADER_LENGTH } from './types'
import { PutComponentOperation } from './putComponent'
import { DeleteComponent } from './deleteComponent'
import { DeleteEntity } from './deleteEntity'
import { AppendValueOperation } from './appendValue'
import { PutNetworkComponentOperation } from './network/putComponentNetwork'
import { DeleteComponentNetwork } from './network/deleteComponentNetwork'
import { DeleteEntityNetwork } from './network/deleteEntityNetwork'

type MessageReader = {
  /** Bytes the reader consumes after the CRDT header, before any trailing data buffer. */
  bodyLength: number
  /**
   * A wrong length a legitimate writer is known to declare for this type, still accepted
   * for compatibility. Only DELETE_ENTITY_NETWORK has one: released SDKs declare it four
   * bytes short of the sixteen they actually write.
   */
  legacyDeclaredLength?: number
  /** Whether the last field of the body is the length of a data buffer that follows it. */
  hasData: boolean
  read(buf: ByteBuffer): CrdtMessage | null
}

function reader(
  bodyLength: number,
  hasData: boolean,
  read: MessageReader['read'],
  legacyDeclaredLength?: number
): MessageReader {
  return { bodyLength, legacyDeclaredLength, hasData, read }
}

// Keyed by the wire value, which is any number until it is matched here.
const readers: Record<number, MessageReader | undefined> = {
  [CrdtMessageType.PUT_COMPONENT]: reader(
    PutComponentOperation.MESSAGE_HEADER_LENGTH,
    true,
    PutComponentOperation.read
  ),
  [CrdtMessageType.DELETE_COMPONENT]: reader(DeleteComponent.MESSAGE_HEADER_LENGTH, false, DeleteComponent.read),
  [CrdtMessageType.DELETE_ENTITY]: reader(DeleteEntity.MESSAGE_HEADER_LENGTH, false, DeleteEntity.read),
  [CrdtMessageType.APPEND_VALUE]: reader(AppendValueOperation.MESSAGE_HEADER_LENGTH, true, AppendValueOperation.read),
  [CrdtMessageType.PUT_COMPONENT_NETWORK]: reader(
    PutNetworkComponentOperation.MESSAGE_HEADER_LENGTH,
    true,
    PutNetworkComponentOperation.read
  ),
  [CrdtMessageType.DELETE_COMPONENT_NETWORK]: reader(
    DeleteComponentNetwork.MESSAGE_HEADER_LENGTH,
    false,
    DeleteComponentNetwork.read
  ),
  // Released SDKs declare this message four bytes shorter than the sixteen they write,
  // so its legacy length is accepted alongside the correct one. `bodyLength` still keeps
  // the read itself inside the chunk.
  [CrdtMessageType.DELETE_ENTITY_NETWORK]: reader(
    DeleteEntityNetwork.MESSAGE_HEADER_LENGTH,
    false,
    DeleteEntityNetwork.read,
    CRDT_MESSAGE_HEADER_LENGTH + 4
  )
}

/**
 * Whether the header declares exactly the frame this type produces, and the chunk holds
 * it. The length has to match, not merely reach far enough: a reader consumes only the
 * bytes of its own fields, so an over-declared frame would otherwise leave the cursor
 * short of the boundary and the loop would read the trailing bytes as another message.
 * A frame that fails here is skipped by its declared length instead, landing on the next
 * message. The fixed-fields check also keeps a reader from running off the end of a short
 * chunk, which input from a peer must never be able to cause.
 */
function holdsBody(
  buf: ByteBuffer,
  header: CrdtMessageHeader,
  { bodyLength, legacyDeclaredLength, hasData }: MessageReader
) {
  const fixedFrame = CRDT_MESSAGE_HEADER_LENGTH + bodyLength
  if (buf.remainingBytes() < fixedFrame) return false

  if (!hasData) {
    return header.length === fixedFrame || header.length === legacyDeclaredLength
  }

  const dataLength = buf.getUint32(buf.currentReadOffset() + fixedFrame - 4)
  return header.length === fixedFrame + dataLength
}

/**
 * Reads the message at the cursor. Returns null without moving the cursor when there is
 * no complete frame, when the type is unknown, or when the frame is too short for the
 * type it claims, so a caller can skip the message by its declared length.
 */
export function readMessage(buf: ByteBuffer): CrdtMessage | null {
  const header = CrdtMessageProtocol.getHeader(buf)
  if (!header) return null

  const messageReader = readers[header.type]
  if (!messageReader || !holdsBody(buf, header, messageReader)) return null

  return messageReader.read(buf)
}
