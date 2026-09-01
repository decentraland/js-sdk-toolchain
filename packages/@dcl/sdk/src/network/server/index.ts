import {
  IEngine,
  Entity,
  CrdtMessageType,
  CrdtMessageBody,
  ProcessMessageResultType,
  ComponentType,
  PutNetworkComponentOperation
} from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { CommsMessage } from '../binary-message-bus'
import { chunkCrdtMessages } from '../chunking'
import * as utils from './utils'
import { AUTH_SERVER_PEER_ID, DEBUG_NETWORK_MESSAGES } from '../message-bus-sync'
import { type BinaryMessageBus } from '../binary-message-bus'
import {
  LastWriteWinElementSetComponentDefinition,
  GrowOnlyValueSetComponentDefinition,
  ComponentDefinition,
  InternalBaseComponent
} from '@dcl/ecs/dist/engine/component'

export const LIVEKIT_MAX_SIZE = 12

export interface ServerValidationConfig {
  engine: IEngine
  binaryMessageBus: ReturnType<typeof BinaryMessageBus>
}

export function createServerValidator(config: ServerValidationConfig) {
  const { engine, binaryMessageBus } = config

  // Initialize components for network operations and transform fixing
  const NetworkEntity = components.NetworkEntity(engine)
  const CreatedBy = components.CreatedBy(engine)
  const NetworkParent = components.NetworkParent(engine)

  // Type guard to check if component supports corrections (both LWW and GrowOnlySet)
  function supportsCorrections<T>(
    component: ComponentDefinition<T>
  ): component is LastWriteWinElementSetComponentDefinition<T> | GrowOnlyValueSetComponentDefinition<T> {
    return (
      (component.componentType === ComponentType.LastWriteWinElementSet ||
        component.componentType === ComponentType.GrowOnlyValueSet) &&
      'getCrdtState' in component
    )
  }

  function findExistingNetworkEntity(message: utils.NetworkMessage): Entity | null {
    // Look for existing network entity mapping (don't create new ones)
    for (const [entityId, networkData] of engine.getEntitiesWith(NetworkEntity)) {
      if (networkData.networkId === message.networkId && networkData.entityId === message.entityId) {
        return entityId
      }
    }
    // Return null if not found
    return null
  }

  function findOrCreateNetworkEntity(message: utils.NetworkMessage, sender: string, isServer: boolean): Entity {
    // Look for existing network entity mapping first
    const existingEntity = findExistingNetworkEntity(message)

    if (existingEntity) {
      return existingEntity
    }

    // Create new entity and network mapping
    const newEntityId = engine.addEntity()
    NetworkEntity.createOrReplace(newEntityId, {
      networkId: message.networkId,
      entityId: message.entityId
    })

    if (isServer) {
      CreatedBy.createOrReplace(newEntityId, { address: sender })
    }

    DEBUG_NETWORK_MESSAGES() &&
      console.log(`[DEBUG] Created new entity ${newEntityId} for network ${message.networkId}:${message.entityId}`)
    return newEntityId
  }

  function convertNetworkToRegularMessage(
    networkMessage: utils.NetworkMessage,
    localEntityId: Entity,
    forceCorrections = false
  ): (CrdtMessageBody & { messageBuffer: Uint8Array }) | null {
    const buffer = new ReadWriteByteBuffer()

    try {
      // Use the well-tested networkMessageToLocal utility with transform fixing for Unity
      const message = utils.networkMessageToLocal(
        networkMessage,
        localEntityId,
        buffer,
        NetworkParent,
        forceCorrections
      )
      return { ...message, messageBuffer: buffer.toBinary() }
    } catch (error) {
      DEBUG_NETWORK_MESSAGES() && console.error('Error converting network message:', error)
      return null
    }
  }

  function validateMessagePermissions(message: utils.RegularMessage, sender: string, _localEntityId: Entity): boolean {
    // Basic checks
    if (!sender || sender === AUTH_SERVER_PEER_ID) {
      return false // Server shouldn't send messages to itself
    }

    if (message.type === CrdtMessageType.DELETE_ENTITY) {
      // TODO: how to handle this case ?
    }

    if (message.type === CrdtMessageType.PUT_COMPONENT || message.type === CrdtMessageType.DELETE_COMPONENT) {
      const component = engine.getComponent(message.componentId) as InternalBaseComponent<unknown>
      const buf = 'data' in message ? new ReadWriteByteBuffer(message.data) : null
      const value = buf ? component.schema.deserialize(buf) : null
      const dryRunCRDT = component.__dry_run_updateFromCrdt(message)
      const validCRDT = [
        ProcessMessageResultType.StateUpdatedData,
        ProcessMessageResultType.StateUpdatedTimestamp,
        ProcessMessageResultType.EntityDeleted
      ].includes(dryRunCRDT)
      const createdBy = CreatedBy.getOrNull(message.entityId)
      const validMessage =
        validCRDT &&
        component.__run_validateBeforeChange(message.entityId, value, sender, createdBy?.address ?? AUTH_SERVER_PEER_ID)

      return !!validMessage
    }

    // For now, basic validation - in the future this will check component sync permissions
    // TODO: Check if sender owns the entity
    // TODO: Check component sync mode ('all' | 'owner' | 'server')
    // TODO: Run component custom validation
    return true
  }

  function broadcastBatchedMessages(messages: utils.NetworkMessage[], excludeSender: string) {
    if (messages.length === 0) return

    // Build the complete buffer with all messages
    const networkBuffer = new ReadWriteByteBuffer()
    for (const message of messages) {
      // Skip oversized messages upfront
      if (message.messageBuffer.byteLength / 1024 > LIVEKIT_MAX_SIZE) {
        console.error(
          `Message too large (${message.messageBuffer.byteLength} bytes), skipping message from ${excludeSender}`
        )
        continue
      }
      networkBuffer.writeBuffer(message.messageBuffer, false)
    }

    // Use the chunking function to split into proper chunks
    const chunks = chunkCrdtMessages(networkBuffer.toBinary(), LIVEKIT_MAX_SIZE)

    for (const chunk of chunks) {
      binaryMessageBus.emit(CommsMessage.CRDT, chunk)
    }
    DEBUG_NETWORK_MESSAGES() &&
      console.log(`Total: ${messages.length} messages in ${chunks.length} chunks from ${excludeSender}`)
  }

  function sendCorrectionToSender(networkMessage: utils.NetworkMessage, sender: string, localEntityId: Entity) {
    try {
      // Only handle component messages (PUT/DELETE), not entity deletion
      if (networkMessage.type === CrdtMessageType.DELETE_ENTITY_NETWORK) {
        DEBUG_NETWORK_MESSAGES() && console.log('[AUTHORITATIVE] Cannot send authoritative message for entity deletion')
        return
      }

      // Safe to access componentId and timestamp now
      const component = engine.getComponent(networkMessage.componentId)

      // Only proceed if component supports authoritative messages (LWW or GrowOnlySet)
      if (!supportsCorrections(component)) {
        DEBUG_NETWORK_MESSAGES() && console.log('[AUTHORITATIVE] Component does not support authoritative messages')
        return
      }

      const serverCRDTState = component.getCrdtState(localEntityId)

      if (serverCRDTState) {
        // Create authoritative message using PUT_COMPONENT_NETWORK
        // Each client will convert this to AUTHORITATIVE_PUT_COMPONENT with proper entity mapping
        const correctionBuffer = new ReadWriteByteBuffer()
        PutNetworkComponentOperation.write(
          networkMessage.entityId, // Use original network entity ID
          serverCRDTState.timestamp,
          networkMessage.componentId,
          networkMessage.networkId,
          serverCRDTState.data,
          correctionBuffer
        )
        // Send authoritative message directly to the sender
        binaryMessageBus.emit(CommsMessage.CRDT_AUTHORITATIVE, correctionBuffer.toBinary(), [sender])

        DEBUG_NETWORK_MESSAGES() &&
          console.log(
            `[AUTHORITATIVE] Sent authoritative message to ${sender} for entity ${localEntityId} component ${networkMessage.componentId} with timestamp ${networkMessage.timestamp}`
          )
      }
    } catch (error) {
      DEBUG_NETWORK_MESSAGES() && console.error('Error sending correction:', error)
    }
  }

  return {
    findExistingNetworkEntity,
    // transform Network messages to CRDT Common Messages.
    processClientMessages: function processClientMessages(value: Uint8Array, sender: string, forceCorrections = false) {
      // console.log(`[CLIENT] Processing message from ${sender}, ${value.length} bytes`)

      // Collect all regular messages in a single buffer for batched application
      const combinedBuffer = new ReadWriteByteBuffer()

      // Clients process network messages from server and convert them to regular messages
      for (const message of utils.readMessages(value)) {
        // Only process network messages in client message handler
        if (utils.isNetworkMessage(message)) {
          const networkMessage = message as utils.NetworkMessage

          // Find or create network entity mapping
          const localEntityId = findOrCreateNetworkEntity(networkMessage, sender, false)

          // Convert network message to regular message or correction message
          const regularMessage = convertNetworkToRegularMessage(networkMessage, localEntityId, forceCorrections)

          if (regularMessage?.messageBuffer.byteLength) {
            combinedBuffer.writeBuffer(regularMessage.messageBuffer, false)
          }
        }
      }
      return combinedBuffer.toBinary()
    },
    // Sever Code: process message, handle permissions, and broadcast if needed.
    processServerMessages: function processServerMessages(value: Uint8Array, sender: string) {
      // console.log(`[SERVER] Processing message from ${sender}, ${value.length} bytes`)

      // Collect all valid messages for batched broadcasting
      const messagesToBroadcast: utils.NetworkMessage[] = []
      const regularMessagesBuffer = new ReadWriteByteBuffer()

      for (const message of utils.readMessages(value)) {
        try {
          // Only process network messages in server message handler
          if (utils.isNetworkMessage(message)) {
            const networkMessage = message as utils.NetworkMessage
            // 1. Find or create network entity mapping
            const localEntityId = findOrCreateNetworkEntity(networkMessage, sender, true)

            // 2. Convert network message to regular message and collect for local application
            const regularMessage = convertNetworkToRegularMessage(networkMessage, localEntityId)

            // 3. Basic permission validation
            if (!validateMessagePermissions(regularMessage as any, sender, localEntityId)) {
              // Send correction back to sender with server's authoritative state
              sendCorrectionToSender(networkMessage, sender, localEntityId)
              continue
            }

            // 4. Collect valid message for batched broadcasting
            messagesToBroadcast.push(networkMessage)

            if (regularMessage?.messageBuffer.byteLength) {
              regularMessagesBuffer.writeBuffer(regularMessage.messageBuffer, false)
            }
          }
        } catch (error) {
          DEBUG_NETWORK_MESSAGES() && console.error('Error processing server message:', error)
        }
      }
      // Batch broadcast all valid messages together
      broadcastBatchedMessages(messagesToBroadcast, sender)
      return regularMessagesBuffer.toBinary()
    },
    // engine changes that needs to be broadcasted.
    convertRegularToNetworkMessage: function convertRegularToNetworkMessage(regularMessage: Uint8Array): Uint8Array[] {
      const groupedBuffer = new ReadWriteByteBuffer()

      // First pass: Convert all regular messages to network format and group them into one big buffer
      for (const message of utils.readMessages(regularMessage)) {
        // Only convert regular messages that have network data
        const networkData = NetworkEntity.getOrNull(message.entityId)

        if (networkData && !utils.isNetworkMessage(message)) {
          utils.localMessageToNetwork(message, networkData, groupedBuffer)
        }
      }

      // Second pass: Use the new chunking function that respects message boundaries
      const totalData = groupedBuffer.toBinary()
      return chunkCrdtMessages(totalData, LIVEKIT_MAX_SIZE)
    }
  }
}
