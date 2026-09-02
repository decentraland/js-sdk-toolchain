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
  /** Smallest declared length a legitimate writer produces for this type. */
  minDeclaredLength: number
  /** Whether the last field of the body is the length of a data buffer that follows it. */
  hasData: boolean
  read(buf: ByteBuffer): CrdtMessage | null
}

function reader(
  bodyLength: number,
  hasData: boolean,
  read: MessageReader['read'],
  minDeclaredLength: number = CRDT_MESSAGE_HEADER_LENGTH + bodyLength
): MessageReader {
  return { bodyLength, minDeclaredLength, hasData, read }
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
  // Released SDKs declare this message four bytes shorter than the sixteen they write.
  // Peers on those versions stay in the wild, so the declared minimum is what they
  // send, while `bodyLength` still keeps the read itself inside the chunk.
  [CrdtMessageType.DELETE_ENTITY_NETWORK]: reader(
    DeleteEntityNetwork.MESSAGE_HEADER_LENGTH,
    false,
    DeleteEntityNetwork.read,
    CRDT_MESSAGE_HEADER_LENGTH + 4
  )
}

/**
 * Whether the frame the header declares, and the chunk behind it, hold every byte the
 * reader will consume. Readers assume their fields are present and would otherwise
 * throw from the byte buffer, which input from a peer must never be able to cause.
 */
function holdsBody(
  buf: ByteBuffer,
  header: CrdtMessageHeader,
  { bodyLength, minDeclaredLength, hasData }: MessageReader
) {
  if (header.length < minDeclaredLength) return false
  if (buf.remainingBytes() < CRDT_MESSAGE_HEADER_LENGTH + bodyLength) return false
  if (!hasData) return true

  const dataLength = buf.getUint32(buf.currentReadOffset() + CRDT_MESSAGE_HEADER_LENGTH + bodyLength - 4)
  return header.length - CRDT_MESSAGE_HEADER_LENGTH - bodyLength >= dataLength
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
