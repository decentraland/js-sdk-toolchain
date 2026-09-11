import { CrdtMessageProtocol } from './crdtMessageProtocol'
import { ByteBuffer } from '../ByteBuffer'
import { CrdtMessageType, CrdtMessage, CrdtMessageHeader, CRDT_MESSAGE_HEADER_LENGTH } from './types'
import { PutComponentOperation } from './putComponent'
import { AuthoritativePutComponentOperation } from './authoritativePutComponent'
import { DeleteComponent } from './deleteComponent'
import { DeleteEntity } from './deleteEntity'
import { AppendValueOperation } from './appendValue'
import { PutNetworkComponentOperation } from './network/putComponentNetwork'
import { DeleteComponentNetwork } from './network/deleteComponentNetwork'
import { DeleteEntityNetwork } from './network/deleteEntityNetwork'

type MessageReader = {
  /** Bytes the reader consumes after the CRDT header, before any trailing data buffer. */
  bodyLength: number
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

const readers: Record<number, MessageReader | undefined> = {
  [CrdtMessageType.PUT_COMPONENT]: reader(
    PutComponentOperation.MESSAGE_HEADER_LENGTH,
    true,
    PutComponentOperation.read
  ),
  [CrdtMessageType.AUTHORITATIVE_PUT_COMPONENT]: reader(
    AuthoritativePutComponentOperation.MESSAGE_HEADER_LENGTH,
    true,
    AuthoritativePutComponentOperation.read
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
  // Legacy SDKs declare 12 bytes but write 16; retain compatibility with their deletes.
  [CrdtMessageType.DELETE_ENTITY_NETWORK]: reader(
    DeleteEntityNetwork.MESSAGE_HEADER_LENGTH,
    false,
    DeleteEntityNetwork.read,
    CRDT_MESSAGE_HEADER_LENGTH + 4
  )
}

// Exact lengths keep the reader cursor aligned with the next frame.
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

/** Returns null without advancing the cursor for incomplete, unknown, or malformed frames. */
export function readMessage(buf: ByteBuffer): CrdtMessage | null {
  const header = CrdtMessageProtocol.getHeader(buf)
  if (!header) return null

  const messageReader = readers[header.type]
  if (!messageReader || !holdsBody(buf, header, messageReader)) return null

  return messageReader.read(buf)
}
