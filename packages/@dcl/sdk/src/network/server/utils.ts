import { Entity } from '@dcl/ecs/dist/engine'
import { CrdtMessageProtocol, NetworkParent } from '@dcl/ecs'
import { ReceiveMessage } from '@dcl/ecs/dist/runtime/types'
import { ReceiveNetworkMessage } from '@dcl/ecs/dist/systems/crdt/types'
import { ByteBuffer, ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { AuthoritativePutComponentOperation, PutComponentOperation } from '@dcl/ecs/dist/serialization/crdt'
import {
  CrdtMessage,
  CrdtMessageBody,
  CrdtMessageHeader,
  CrdtMessageType,
  DeleteComponentMessage,
  DeleteComponentNetworkMessage,
  DeleteEntityMessage,
  DeleteEntityNetworkMessage,
  PutComponentMessage,
  AuthoritativePutComponentMessage,
  PutNetworkComponentMessage
} from '@dcl/ecs/dist/serialization/crdt/types'
import { DeleteComponent } from '@dcl/ecs/dist/serialization/crdt/deleteComponent'
import { DeleteEntity } from '@dcl/ecs/dist/serialization/crdt/deleteEntity'
import { INetowrkEntityType } from '@dcl/ecs/dist/components/types'
import { PutNetworkComponentOperation } from '@dcl/ecs/dist/serialization/crdt/network/putComponentNetwork'
import { DeleteComponentNetwork } from '@dcl/ecs/dist/serialization/crdt/network/deleteComponentNetwork'
import { DeleteEntityNetwork } from '@dcl/ecs/dist/serialization/crdt/network/deleteEntityNetwork'
import { TransformSchema, COMPONENT_ID as TransformComponentId } from '@dcl/ecs/dist/components/manual/Transform'

export type NetworkMessage = (
  | PutNetworkComponentMessage
  | DeleteComponentNetworkMessage
  | DeleteEntityNetworkMessage
) & { messageBuffer: Uint8Array }

export type RegularMessage = (
  | PutComponentMessage
  | AuthoritativePutComponentMessage
  | DeleteComponentMessage
  | DeleteEntityMessage
) & {
  messageBuffer: Uint8Array
}
export function readMessages(data: Uint8Array): (NetworkMessage | RegularMessage)[] {
  const buffer = new ReadWriteByteBuffer(data)
  const messages: (NetworkMessage | RegularMessage)[] = []
  let header: CrdtMessageHeader | null
  while ((header = CrdtMessageProtocol.getHeader(buffer))) {
    const offset = buffer.currentReadOffset()
    let message: CrdtMessage | undefined = undefined

    // Network messages
    if (header.type === CrdtMessageType.DELETE_COMPONENT_NETWORK) {
      message = DeleteComponentNetwork.read(buffer)!
    } else if (header.type === CrdtMessageType.PUT_COMPONENT_NETWORK) {
      message = PutNetworkComponentOperation.read(buffer)!
    } else if (header.type === CrdtMessageType.DELETE_ENTITY_NETWORK) {
      message = DeleteEntityNetwork.read(buffer)!
    }
    // Regular messages
    else if (header.type === CrdtMessageType.PUT_COMPONENT) {
      message = PutComponentOperation.read(buffer)!
    } else if (header.type === CrdtMessageType.AUTHORITATIVE_PUT_COMPONENT) {
      message = AuthoritativePutComponentOperation.read(buffer)!
    } else if (header.type === CrdtMessageType.DELETE_COMPONENT) {
      message = DeleteComponent.read(buffer)!
    } else if (header.type === CrdtMessageType.DELETE_ENTITY) {
      message = DeleteEntity.read(buffer)!
    } else {
      // consume unknown messages
      buffer.incrementReadOffset(header.length)
    }

    if (message) {
      messages.push({
        ...message,
        messageBuffer: buffer.buffer().subarray(offset, buffer.currentReadOffset())
      })
    }
  }
  return messages
}

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
  destinationBuffer: ByteBuffer,
  // Optional network parent component for transform fixing
  networkParentComponent?: typeof NetworkParent,
  // Force corrections - converts PUT_COMPONENT_NETWORK to authoritative_PUT_COMPONENT
  forceCorrections = false
): CrdtMessageBody {
  if (message.type === CrdtMessageType.PUT_COMPONENT_NETWORK) {
    let messageData = message.data

    // Fix transform parent if needed for Unity/engine processing
    if (message.componentId === TransformComponentId && networkParentComponent) {
      const parentNetwork = networkParentComponent.getOrNull(localEntityId)
      messageData = fixTransformParent(message, parentNetwork?.entityId)
    }
    if (forceCorrections) {
      // Use AUTHORITATIVE_PUT_COMPONENT for forced state updates
      AuthoritativePutComponentOperation.write(
        localEntityId,
        message.timestamp,
        message.componentId,
        messageData,
        destinationBuffer
      )
      return {
        type: CrdtMessageType.AUTHORITATIVE_PUT_COMPONENT,
        componentId: message.componentId,
        timestamp: message.timestamp,
        data: messageData,
        entityId: localEntityId
      }
    } else {
      // Normal PUT_COMPONENT conversion
      PutComponentOperation.write(localEntityId, message.timestamp, message.componentId, messageData, destinationBuffer)
      return {
        type: CrdtMessageType.PUT_COMPONENT,
        componentId: message.componentId,
        timestamp: message.timestamp,
        data: messageData,
        entityId: localEntityId
      }
    }
  } else if (message.type === CrdtMessageType.DELETE_COMPONENT_NETWORK) {
    DeleteComponent.write(localEntityId, message.componentId, message.timestamp, destinationBuffer)
    return {
      type: CrdtMessageType.DELETE_COMPONENT,
      componentId: message.componentId,
      timestamp: message.timestamp,
      entityId: localEntityId
    }
  } else if (message.type === CrdtMessageType.DELETE_ENTITY_NETWORK) {
    DeleteEntity.write(localEntityId, destinationBuffer)
    return {
      type: CrdtMessageType.DELETE_ENTITY,
      entityId: localEntityId
    }
  }
  throw 1
}

export function localMessageToNetwork(
  message: ReceiveMessage,
  network: INetowrkEntityType,
  destinationBuffer: ByteBuffer
) {
  if (message.type === CrdtMessageType.PUT_COMPONENT) {
    PutNetworkComponentOperation.write(
      network.entityId,
      message.timestamp,
      message.componentId,
      network.networkId,
      message.data,
      destinationBuffer
    )
  } else if (message.type === CrdtMessageType.DELETE_COMPONENT) {
    DeleteComponentNetwork.write(
      network.entityId,
      message.componentId,
      message.timestamp,
      network.networkId,
      destinationBuffer
    )
  } else if (message.type === CrdtMessageType.DELETE_ENTITY) {
    DeleteEntityNetwork.write(network.entityId, network.networkId, destinationBuffer)
  }
}

export function fixTransformParent(message: ReceiveMessage, parent?: Entity): Uint8Array {
  const buffer = new ReadWriteByteBuffer()
  const transform = 'data' in message && TransformSchema.deserialize(new ReadWriteByteBuffer(message.data))

  if (!transform) throw new Error('Invalid parent transform')

  // Generate new transform raw data with the parent
  const newTransform = { ...transform, parent }
  TransformSchema.serialize(newTransform, buffer)
  return buffer.toBinary()
}
