import { IEngine, Entity } from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { CommsMessage } from '../binary-message-bus'
import * as utils from './utils'

export const LIVEKIT_MAX_SIZE = 12

export interface ServerValidationConfig {
  engine: IEngine
  binaryMessageBus: any // Use any for now to avoid circular import issues
  transport: { onmessage?: (data: Uint8Array) => void }
  authServerPeerId: string
  debugNetworkMessages: () => boolean
}

export function createServerValidator(config: ServerValidationConfig) {
  const { engine, binaryMessageBus, transport, authServerPeerId, debugNetworkMessages } = config

  // Initialize components for network operations and transform fixing
  const NetworkEntity = components.NetworkEntity(engine)
  const NetworkParent = components.NetworkParent(engine)

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

  function findOrCreateNetworkEntity(message: utils.NetworkMessage): Entity {
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
    debugNetworkMessages() && console.log(`[DEBUG] Created new entity ${newEntityId} for network ${message.networkId}:${message.entityId}`)
    return newEntityId
  }

  function convertNetworkToRegularMessage(networkMessage: utils.NetworkMessage, localEntityId: Entity): Uint8Array | null {
    const buffer = new ReadWriteByteBuffer()
    
    try {
      // Use the well-tested networkMessageToLocal utility with transform fixing for Unity
      utils.networkMessageToLocal(networkMessage, localEntityId, buffer, NetworkParent)
      return buffer.toBinary()
    } catch (error) {
      debugNetworkMessages() && console.error('Error converting network message:', error)
      return null
    }
  }

  function validateMessagePermissions(_message: utils.NetworkMessage, sender: string, _localEntityId: Entity): boolean {
    // For now, basic validation - in the future this will check component sync permissions
    // TODO: Check if sender owns the entity
    // TODO: Check component sync mode ('all' | 'owner' | 'server')
    // TODO: Run component custom validation
    
    // Basic checks
    if (!sender || sender === authServerPeerId) {
      return false // Server shouldn't send messages to itself
    }
    
    // For now, allow all operations (will be enhanced with proper permission system)
    return true
  }


  function broadcastBatchedMessages(messages: utils.NetworkMessage[], excludeSender: string) {
    if (messages.length === 0) return
    
    const networkBuffer = new ReadWriteByteBuffer()
    const chunks: Uint8Array[] = []
    
    for (const message of messages) {
      // Check if adding this message would exceed the size limit
      const currentBufferSize = networkBuffer.toBinary().byteLength
      const messageSize = message.messageBuffer.byteLength
      
      if ((currentBufferSize + messageSize) / 1024 > LIVEKIT_MAX_SIZE) {
        // If the current buffer has content, save it as a chunk
        if (currentBufferSize > 0) {
          chunks.push(networkBuffer.toCopiedBinary())
          networkBuffer.resetBuffer()
        }
        
        // If the message itself is larger than the limit, we need to handle it specially
        if (messageSize / 1024 > LIVEKIT_MAX_SIZE) {
          console.error(
            `Message too large (${messageSize} bytes), skipping message from ${excludeSender}`
          )
          continue
        }
      }
      
      // Add message to current buffer
      networkBuffer.writeBuffer(message.messageBuffer, false)
    }
    
    // Add any remaining data as the final chunk
    if (networkBuffer.currentWriteOffset() > 0) {
      chunks.push(networkBuffer.toBinary())
    }
    
    for (const chunk of chunks) {
      // add to the queue.
      binaryMessageBus.emit(CommsMessage.CRDT, chunk)
    }
    
    debugNetworkMessages() && console.log(`Total: ${messages.length} messages in ${chunks.length} chunks from ${excludeSender}`)
  }

  

  return {
    // transform Network messages to CRDT Common Messages.
    processClientMessages: function processClientMessages(value: Uint8Array, sender: string) {
      console.log(`[CLIENT] Processing message from ${sender}, ${value.length} bytes`)
      
      // Collect all regular messages in a single buffer for batched application
      const combinedBuffer = new ReadWriteByteBuffer()
      
      // Clients process network messages from server and convert them to regular messages
      for (const message of utils.readMessages(value)) {        
        
        // Only process network messages in client message handler
        if (utils.isNetworkMessage(message)) {
          const networkMessage = message as utils.NetworkMessage
          
          // Find or create network entity mapping
          const localEntityId = findOrCreateNetworkEntity(networkMessage)
          
          // Convert network message to regular message
          const regularMessageBuffer = convertNetworkToRegularMessage(networkMessage, localEntityId)
          if (regularMessageBuffer) {
            combinedBuffer.writeBuffer(regularMessageBuffer, false)
          }
        }
      }
      return combinedBuffer.toBinary()
    },
    // Sever Code: process message, handle permissions, and broadcast if needed.
    processServerMessages: function processServerMessages(value: Uint8Array, sender: string) {
      console.log(`[SERVER] Processing message from ${sender}, ${value.length} bytes`)
      
      // Collect all valid messages for batched broadcasting
      const messagesToBroadcast: utils.NetworkMessage[] = []
      const regularMessagesBuffer = new ReadWriteByteBuffer()
      
      for (const message of utils.readMessages(value)) {
        try {
          const componentId = 'componentId' in message ? message.componentId : 'N/A'
          console.log(`[SERVER] Message type: ${message.type}, entity: ${message.entityId}, component: ${componentId}`)
          // Only process network messages in server message handler
          if (utils.isNetworkMessage(message)) {
            const networkMessage = message as utils.NetworkMessage
            
            // 1. Find or create network entity mapping
            const localEntityId = findOrCreateNetworkEntity(networkMessage)
            
            // 2. Basic permission validation
            if (!validateMessagePermissions(networkMessage, sender, localEntityId)) {
              // Send correction back to sender
              // sendCorrectionToSender(networkMessage, sender, localEntityId)
              // also we need to check if the CRDT is valid, maybe another peer win.
              continue
            }
            
            // 3. Collect valid message for batched broadcasting
            messagesToBroadcast.push(networkMessage)
            
            // 4. Convert network message to regular message and collect for local application
            const regularMessageBuffer = convertNetworkToRegularMessage(networkMessage, localEntityId)
            if (regularMessageBuffer) {
              regularMessagesBuffer.writeBuffer(regularMessageBuffer, false)
            }
          }
        } catch (error) {
          debugNetworkMessages() && console.error('Error processing server message:', error)
        }
      }
      
      // Batch broadcast all valid messages together
      broadcastBatchedMessages(messagesToBroadcast, sender)
      
      // Apply all regular messages locally as a single batch
      if (regularMessagesBuffer.currentWriteOffset() > 0) {
        transport.onmessage!(regularMessagesBuffer.toBinary())
      }
    },
    // engine changes that needs to be broadcasted.
    convertRegularToNetworkMessage: function convertRegularToNetworkMessage(regularMessage: Uint8Array): Uint8Array[] {
      const groupedBuffer = new ReadWriteByteBuffer()
      
      // First pass: Convert all regular messages to network format and group them into one big buffer
      for (const message of utils.readMessages(regularMessage)) {
        // Only convert regular messages that have network data
        const networkData = NetworkEntity.getOrNull(message.entityId)
        
        if (networkData && !utils.isNetworkMessage(message)) {
          utils.localMessageToNetwork(
            message, 
            networkData, 
            groupedBuffer
          )
        }
      }
      
      // Second pass: Chunk the grouped buffer into MAX_LIVEKIT_SIZE pieces
      const chunks: Uint8Array[] = []
      const maxChunkSizeBytes = LIVEKIT_MAX_SIZE * 1024 // Convert KB to bytes
      const totalData = groupedBuffer.toBinary()
      
      if (totalData.length === 0) {
        return chunks
      }
      
      // Split the big buffer into chunks of maxChunkSizeBytes
      for (let i = 0; i < totalData.length; i += maxChunkSizeBytes) {
        const chunkEnd = Math.min(i + maxChunkSizeBytes, totalData.length)
        const chunk = totalData.subarray(i, chunkEnd)
        chunks.push(chunk)
      }
      
      return chunks
    }  
  }
}