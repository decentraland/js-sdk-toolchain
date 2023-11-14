import { Entity } from '../../../engine'
import { ReceiveMessage } from '../../../runtime/types'
import { ReceiveNetworkMessage } from '../../../systems/crdt/types'
import { ByteBuffer } from '../../ByteBuffer'
import { PutComponentOperation } from '../putComponent'
import { CrdtMessageType } from '../types'
import { DeleteComponent } from '../deleteComponent'
import { DeleteEntity } from '../deleteEntity'
import { INetowrkEntityType } from '../../../components/types'
import { PutNetworkComponentOperation } from './putComponentNetwork'
import { DeleteComponentNetwork } from './deleteComponentNetwork'
import { DeleteEntityNetwork } from './deleteEntityNetwork'

export function isNetworkMessage(message: ReceiveMessage): message is ReceiveNetworkMessage {
  return [
    CrdtMessageType.DELETE_COMPONENT_NETWORK,
    CrdtMessageType.DELETE_ENTITY_NETWORK,
    CrdtMessageType.PUT_COMPONENT_NETWORK
  ].includes(message.type)
}

export function networkMessageToLocal(
  message: ReceiveNetworkMessage,
  localEntityId: Entity,
  buffer: ByteBuffer,
  destinationBuffer: ByteBuffer
) {
  const offset = buffer.currentWriteOffset()
  if (message.type === CrdtMessageType.PUT_COMPONENT_NETWORK) {
    PutComponentOperation.write(localEntityId, message.timestamp, message.componentId, message.data, buffer)
  } else if (message.type === CrdtMessageType.DELETE_COMPONENT_NETWORK) {
    DeleteComponent.write(localEntityId, message.componentId, message.timestamp, buffer)
  } else if (message.type === CrdtMessageType.DELETE_ENTITY_NETWORK) {
    DeleteEntity.write(localEntityId, buffer)
  }
  destinationBuffer.writeBuffer(buffer.buffer().subarray(offset, buffer.currentWriteOffset()), false)
}

export function localMessageToNetwork(
  message: ReceiveMessage,
  network: INetowrkEntityType,
  buffer: ByteBuffer,
  destinationBuffer: ByteBuffer
) {
  const offset = buffer.currentWriteOffset()
  if (message.type === CrdtMessageType.PUT_COMPONENT) {
    PutNetworkComponentOperation.write(
      network.entityId,
      message.timestamp,
      message.componentId,
      network.networkId,
      message.data,
      buffer
    )
  } else if (message.type === CrdtMessageType.DELETE_COMPONENT) {
    DeleteComponentNetwork.write(network.entityId, message.componentId, message.timestamp, network.networkId, buffer)
  } else if (message.type === CrdtMessageType.DELETE_ENTITY) {
    DeleteEntityNetwork.write(network.entityId, network.networkId, buffer)
  }
  destinationBuffer.writeBuffer(buffer.buffer().subarray(offset, buffer.currentWriteOffset()), false)
}
