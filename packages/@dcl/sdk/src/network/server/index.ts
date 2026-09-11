import {
  IEngine,
  Entity,
  EntityUtils,
  CrdtMessageType,
  CrdtMessageBody,
  ProcessMessageResultType,
  ComponentType,
  PutNetworkComponentOperation
} from '@dcl/ecs'
import * as components from '@dcl/ecs/dist/components'
import { ReadWriteByteBuffer } from '@dcl/ecs/dist/serialization/ByteBuffer'
import { createVersionGSet } from '@dcl/ecs/dist/systems/crdt/gset'
import { DeleteEntity } from '@dcl/ecs/dist/serialization/crdt/deleteEntity'
import { DeleteEntityNetwork } from '@dcl/ecs/dist/serialization/crdt/network/deleteEntityNetwork'
import { CommsMessage } from '../binary-message-bus'
import { EntityRemovalRequest, EntityRemovalResponse, encodeEntityRemovalResponse } from '../entity-removal-protocol'
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

const MAX_REMOVAL_SESSIONS_PER_PEER = 8
const MAX_REMOVAL_RESULTS_PER_SESSION = 128

type RemovalSession = {
  highestRequestId: number
  results: Map<number, EntityRemovalResponse>
}

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
  const removedEntities = new Map<number, ReturnType<typeof createVersionGSet>>()
  const removedSharedEntities = new Set<Entity>()
  const removalSessions = new Map<string, Map<string, RemovalSession>>()

  function wasRemoved(message: { networkId: number; entityId: Entity }): boolean {
    if (message.networkId === 0) return removedSharedEntities.has(message.entityId)
    const [number, version] = EntityUtils.fromEntityId(message.entityId)
    return removedEntities.get(message.networkId)?.has(number, version) ?? false
  }

  function markRemoved(message: { networkId: number; entityId: Entity }): void {
    // Shared enum IDs are independent constants, not versioned ECS IDs.
    if (message.networkId === 0) {
      removedSharedEntities.add(message.entityId)
      return
    }
    const [number, version] = EntityUtils.fromEntityId(message.entityId)
    let versions = removedEntities.get(message.networkId)
    if (!versions) {
      versions = createVersionGSet()
      removedEntities.set(message.networkId, versions)
    }
    versions.addTo(number, version)
  }

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

  function findExistingNetworkEntity(message: { networkId: number; entityId: Entity }): Entity | null {
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
      const owner = CreatedBy.getOrNull(message.entityId)?.address ?? AUTH_SERVER_PEER_ID

      for (const definition of engine.componentsIter()) {
        if (!definition.has(message.entityId)) continue

        const component = definition as unknown as InternalBaseComponent<unknown>
        if (!component.__run_validateBeforeChange(message.entityId, undefined, sender, owner)) {
          return false
        }
      }

      return true
    }

    if (message.type === CrdtMessageType.PUT_COMPONENT || message.type === CrdtMessageType.DELETE_COMPONENT) {
      const component = engine.getComponent(message.componentId) as InternalBaseComponent<unknown>
      const buf = 'data' in message ? new ReadWriteByteBuffer(message.data) : null
      const value = buf ? component.schema.deserialize(buf) : undefined
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

  function sendRemovalResult(response: EntityRemovalResponse, sender: string): void {
    binaryMessageBus.emit(CommsMessage.ENTITY_REMOVAL_RESULT, encodeEntityRemovalResponse(response), [sender])
  }

  function processEntityRemovalRequest(request: EntityRemovalRequest, sender: string): Uint8Array {
    const empty = new Uint8Array()
    if (!sender || sender === AUTH_SERVER_PEER_ID) return empty

    let sessions = removalSessions.get(sender)
    if (!sessions) {
      sessions = new Map()
      removalSessions.set(sender, sessions)
    }
    const sessionKey = `${request.sessionIdHigh}:${request.sessionIdLow}`
    let session = sessions.get(sessionKey)
    if (!session) {
      if (sessions.size >= MAX_REMOVAL_SESSIONS_PER_PEER) {
        sendRemovalResult({ ...request, status: wasRemoved(request) ? 'accepted' : 'rejected' }, sender)
        return empty
      }
      session = { highestRequestId: -1, results: new Map() }
      sessions.set(sessionKey, session)
    }

    const previous = session.results.get(request.requestId)
    if (previous) {
      const sameEntity = previous.networkId === request.networkId && previous.entityId === request.entityId
      const response: EntityRemovalResponse = sameEntity
        ? { ...previous, status: wasRemoved(request) ? 'accepted' : previous.status }
        : { ...request, status: 'rejected' }
      sendRemovalResult(response, sender)
      return empty
    }
    // Unseen IDs may arrive out of order within the window; older IDs cannot be revalidated.
    if (request.requestId <= session.highestRequestId - MAX_REMOVAL_RESULTS_PER_SESSION) {
      sendRemovalResult({ ...request, status: wasRemoved(request) ? 'accepted' : 'rejected' }, sender)
      return empty
    }
    session.highestRequestId = Math.max(session.highestRequestId, request.requestId)
    for (const requestId of session.results.keys()) {
      if (requestId <= session.highestRequestId - MAX_REMOVAL_RESULTS_PER_SESSION) {
        session.results.delete(requestId)
      }
    }

    let status: EntityRemovalResponse['status'] = 'rejected'
    let regularBytes = empty
    let broadcast: utils.NetworkMessage | null = null
    if (wasRemoved(request)) {
      status = 'accepted'
    } else {
      const entity = findExistingNetworkEntity(request)
      if (entity !== null) {
        const regularBuffer = new ReadWriteByteBuffer()
        DeleteEntity.write(entity, regularBuffer)
        const regularMessage: utils.RegularMessage = {
          type: CrdtMessageType.DELETE_ENTITY,
          entityId: entity,
          length: regularBuffer.currentWriteOffset(),
          messageBuffer: regularBuffer.toBinary()
        }
        let allowed = false
        try {
          allowed = validateMessagePermissions(regularMessage, sender, entity)
        } catch {
          allowed = false
        }
        if (allowed) {
          status = 'accepted'
          markRemoved(request)
          regularBytes = regularMessage.messageBuffer
          const networkBuffer = new ReadWriteByteBuffer()
          DeleteEntityNetwork.write(request.entityId, request.networkId, networkBuffer)
          broadcast = {
            type: CrdtMessageType.DELETE_ENTITY_NETWORK,
            entityId: request.entityId,
            networkId: request.networkId,
            length: networkBuffer.getUint32(0),
            messageBuffer: networkBuffer.toBinary()
          }
        }
      }
    }

    const response: EntityRemovalResponse = { ...request, status }
    session.results.set(request.requestId, response)
    if (broadcast) broadcastBatchedMessages([broadcast], sender)
    sendRemovalResult(response, sender)
    return regularBytes
  }

  return {
    processEntityRemovalRequest,
    // Replay protection lasts for the peer's room lifetime; reconnects use a new session nonce.
    forgetPeer: (sender: string): void => {
      removalSessions.delete(sender)
    },
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

          if (networkMessage.type === CrdtMessageType.DELETE_ENTITY_NETWORK) {
            markRemoved(networkMessage)
          } else if (wasRemoved(networkMessage)) {
            continue
          }

          // Find or create network entity mapping
          const localEntityId =
            networkMessage.type === CrdtMessageType.DELETE_ENTITY_NETWORK
              ? findExistingNetworkEntity(networkMessage)
              : findOrCreateNetworkEntity(networkMessage, sender, false)
          if (localEntityId === null) continue

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
            if (wasRemoved(networkMessage)) {
              if (
                networkMessage.type === CrdtMessageType.DELETE_ENTITY_NETWORK &&
                sender &&
                sender !== AUTH_SERVER_PEER_ID
              ) {
                binaryMessageBus.emit(CommsMessage.CRDT, networkMessage.messageBuffer, [sender])
              }
              continue
            }
            // 1. Find or create network entity mapping
            const localEntityId =
              networkMessage.type === CrdtMessageType.DELETE_ENTITY_NETWORK
                ? findExistingNetworkEntity(networkMessage)
                : findOrCreateNetworkEntity(networkMessage, sender, true)
            if (localEntityId === null) continue

            // 2. Convert network message to regular message and collect for local application
            const regularMessage = convertNetworkToRegularMessage(networkMessage, localEntityId)

            // 3. Basic permission validation
            if (!validateMessagePermissions(regularMessage as any, sender, localEntityId)) {
              // Send correction back to sender with server's authoritative state
              sendCorrectionToSender(networkMessage, sender, localEntityId)
              continue
            }

            // 4. Collect valid message for batched broadcasting
            if (networkMessage.type === CrdtMessageType.DELETE_ENTITY_NETWORK) {
              markRemoved(networkMessage)
            }
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
          if (message.type === CrdtMessageType.DELETE_ENTITY) {
            markRemoved(networkData)
          }
          utils.localMessageToNetwork(message, networkData, groupedBuffer)
        }
      }

      // Second pass: Use the new chunking function that respects message boundaries
      const totalData = groupedBuffer.toBinary()
      return chunkCrdtMessages(totalData, LIVEKIT_MAX_SIZE)
    }
  }
}
