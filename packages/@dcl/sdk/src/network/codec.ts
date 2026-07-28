// The one module that turns CRDT bytes into messages and messages back into
// bytes: reading a stream, translating between the local and the network
// encoding of a message, and cutting a stream into comms-sized chunks. Nothing
// else in the network layer may parse or pack CRDT bytes.
import { CrdtMessageProtocol, CrdtMessageType, Entity, NetworkParent } from '@dcl/ecs'
import { LIVEKIT_MAX_SIZE } from './constants'
import {
  AuthoritativePutComponentOperation,
  ByteBuffer,
  CrdtMessage,
  CrdtMessageBody,
  CrdtMessageHeader,
  DeleteComponent,
  DeleteComponentMessage,
  DeleteComponentNetwork,
  DeleteComponentNetworkMessage,
  DeleteEntity,
  DeleteEntityMessage,
  DeleteEntityNetwork,
  DeleteEntityNetworkMessage,
  INetowrkEntityType,
  PutComponentMessage,
  PutComponentOperation,
  AuthoritativePutComponentMessage,
  PutNetworkComponentMessage,
  PutNetworkComponentOperation,
  ReadWriteByteBuffer,
  ReceiveMessage,
  ReceiveNetworkMessage,
  TransformSchema,
  TransformComponentId
} from './ecs-adapter'

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

/** A message ready to go out: its bytes, plus enough identity to name it if it has to be dropped. */
export type PackableMessage = { messageBuffer: Uint8Array; entityId: Entity; componentId?: number }

/**
 * Cuts a stream of already-serialized messages into comms-sized chunks, never
 * splitting one. The single place a chunk boundary is decided and the single
 * place an oversized message is reported.
 *
 * `messages` is pulled lazily and each `messageBuffer` is copied into the chunk
 * before the next one is pulled, so a caller may yield views over a buffer it
 * reuses between messages.
 */
export function packChunks(messages: Iterable<PackableMessage>, maxSizeKB: number = LIVEKIT_MAX_SIZE): Uint8Array[] {
  const chunk = new ReadWriteByteBuffer()
  const chunks: Uint8Array[] = []

  for (const message of messages) {
    const messageSize = message.messageBuffer.byteLength

    if ((chunk.currentWriteOffset() + messageSize) / 1024 > maxSizeKB) {
      if (chunk.currentWriteOffset() > 0) {
        chunks.push(chunk.toCopiedBinary())
        chunk.resetBuffer()
      }

      // A message that cannot fit in a chunk of its own has nowhere to go: comms
      // caps a packet, and the CRDT protocol has no way to split one message over
      // two of them. It is dropped, loudly — the ceiling is real.
      if (messageSize / 1024 > maxSizeKB) {
        const target =
          message.componentId === undefined
            ? `entity ${message.entityId}`
            : `component ${message.componentId} for entity ${message.entityId}`
        console.error(
          `Message too large (${messageSize} bytes), skipping ${target}: over the ${maxSizeKB}KB comms limit, which a single CRDT message cannot be split across`
        )
        continue
      }
    }

    chunk.writeBuffer(message.messageBuffer, false)
  }

  if (chunk.currentWriteOffset() > 0) chunks.push(chunk.toBinary())

  return chunks
}

/**
 * Parse-then-pack, for a caller holding raw bytes rather than parsed messages.
 *
 * ponytail: no production caller is left — killing the double parse gave every
 * one of them the parsed messages already. It stays because the wire
 * characterization pins chunk boundaries through it, and pinning them through
 * the composition is what makes those goldens comparable across the refactor.
 * Upgrade path: point the characterization at `packChunks(readMessages(...))`
 * and delete this.
 */
export function chunkCrdtMessages(data: Uint8Array, maxSizeKB: number = LIVEKIT_MAX_SIZE): Uint8Array[] {
  return packChunks(readMessages(data), maxSizeKB)
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
  throw new Error(
    `networkMessageToLocal: unhandled message type ${CrdtMessageType[(message as ReceiveNetworkMessage).type]}`
  )
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
