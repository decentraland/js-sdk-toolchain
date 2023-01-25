import CrdtMessageProtocol, { DeleteComponent, DeleteEntity, PutComponentOperation } from '.'
import { ByteBuffer } from '../ByteBuffer'
import { CrdtMessageType, CrdtMessage } from './types'

export function readMessage(buf: ByteBuffer): CrdtMessage | null {
  const header = CrdtMessageProtocol.getHeader(buf)
  if (!header) return null

  if (header.type === CrdtMessageType.PUT_COMPONENT) {
    return PutComponentOperation.read(buf)
  } else if (header.type === CrdtMessageType.DELETE_COMPONENT) {
    return DeleteComponent.read(buf)
  } else if (header.type === CrdtMessageType.DELETE_ENTITY) {
    return DeleteEntity.read(buf)
  }

  return null
}
