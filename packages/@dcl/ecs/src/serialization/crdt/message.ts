import { CrdtMessageProtocol } from './crdtMessageProtocol'
import { ByteBuffer } from '../ByteBuffer'
import { CrdtMessageType, CrdtMessage } from './types'
import { PutComponentOperation } from './putComponent'
import { DeleteComponent } from './deleteComponent'
import { DeleteEntity } from './deleteEntity'
import { AppendValueOperation } from './appendValue'
import { PutNetworkComponentOperation } from './network/putComponentNetwork'
import { DeleteComponentNetwork } from './network/deleteComponentNetwork'
import { DeleteEntityNetwork } from './network/deleteEntityNetwork'

export function readMessage(buf: ByteBuffer): CrdtMessage | null {
  const header = CrdtMessageProtocol.getHeader(buf)
  if (!header) return null

  if (header.type === CrdtMessageType.PUT_COMPONENT) {
    return PutComponentOperation.read(buf)
  } else if (header.type === CrdtMessageType.PUT_COMPONENT_NETWORK) {
    return PutNetworkComponentOperation.read(buf)
  } else if (header.type === CrdtMessageType.DELETE_COMPONENT) {
    return DeleteComponent.read(buf)
  } else if (header.type === CrdtMessageType.DELETE_COMPONENT_NETWORK) {
    return DeleteComponentNetwork.read(buf)
  } else if (header.type === CrdtMessageType.APPEND_VALUE) {
    return AppendValueOperation.read(buf)
  } else if (header.type === CrdtMessageType.DELETE_ENTITY) {
    return DeleteEntity.read(buf)
  } else if (header.type === CrdtMessageType.DELETE_ENTITY_NETWORK) {
    return DeleteEntityNetwork.read(buf)
  }

  return null
}
