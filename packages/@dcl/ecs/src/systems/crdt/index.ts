import { Entity, EntityState } from '../../engine/entity'
import type { ComponentDefinition } from '../../engine'
import type { PreEngine } from '../../engine/types'
import { ReadWriteByteBuffer } from '../../serialization/ByteBuffer'
import { AppendValueOperation, CrdtMessageProtocol } from '../../serialization/crdt'
import { DeleteComponent } from '../../serialization/crdt/deleteComponent'
import { DeleteEntity } from '../../serialization/crdt/deleteEntity'
import { PutComponentOperation } from '../../serialization/crdt/putComponent'
import { AuthoritativePutComponentOperation } from '../../serialization/crdt/authoritativePutComponent'
import { CrdtMessageType, CrdtMessageHeader, CrdtMessage } from '../../serialization/crdt/types'
import { ReceiveMessage, Transport } from './types'

/**
 * @public
 */
export type OnChangeFunction = (
  entity: Entity,
  operation: CrdtMessageType,
  component?: ComponentDefinition<any>,
  componentValue?: any
) => void

/**
 * @internal
 */
export function crdtSceneSystem(engine: PreEngine, onProcessEntityComponentChange: OnChangeFunction | null) {
  const transports: Transport[] = []

  // No network components needed - pure CRDT processing only

  // Messages that we received at transport.onMessage waiting to be processed
  const receivedMessages: ReceiveMessage[] = []
  // Messages already processed by the engine but that we need to broadcast to other transports.
  const broadcastMessages: ReceiveMessage[] = []

  /**
   *
   * @param transportId tranport id to identiy messages
   * @returns a function to process received messages
   */
  function parseChunkMessage(transportId: number) {
    /**
     * Receives a chunk of binary messages and stores all the valid
     * Component Operation Messages at messages queue
     * @param chunkMessage A chunk of binary messages
     */
    return function parseChunkMessage(chunkMessage: Uint8Array) {
      const buffer = new ReadWriteByteBuffer(chunkMessage)

      let header: CrdtMessageHeader | null
      while ((header = CrdtMessageProtocol.getHeader(buffer))) {
        const offset = buffer.currentReadOffset()
        let message: CrdtMessage | undefined = undefined
        if (header.type === CrdtMessageType.DELETE_COMPONENT) {
          message = DeleteComponent.read(buffer)!
        } else if (header.type === CrdtMessageType.PUT_COMPONENT) {
          message = PutComponentOperation.read(buffer)!
        } else if (header.type === CrdtMessageType.AUTHORITATIVE_PUT_COMPONENT) {
          message = AuthoritativePutComponentOperation.read(buffer)!
        } else if (header.type === CrdtMessageType.DELETE_ENTITY) {
          message = DeleteEntity.read(buffer)!
        } else if (header.type === CrdtMessageType.APPEND_VALUE) {
          message = AppendValueOperation.read(buffer)!
        } else {
          // Unknown message, we skip it (including NETWORK messages)
          buffer.incrementReadOffset(header.length)
        }
        if (message) {
          receivedMessages.push({
            ...message,
            transportId,
            messageBuffer: buffer.buffer().subarray(offset, buffer.currentReadOffset())
          })
        }
      }
    }
  }

  /**
   * Return and clear the messaes queue
   * @returns messages recieved by the transport to process on the next tick
   */
  function getMessages<T = unknown>(value: T[]) {
    const messagesToProcess = value.splice(0, value.length)
    return messagesToProcess
  }

  /**
   * This fn will be called on every tick.
   * Process all the messages queue received by the transport
   */
  async function receiveMessages() {
    const messagesToProcess = getMessages(receivedMessages)
    const entitiesShouldBeCleaned: Entity[] = []

    for (const msg of messagesToProcess) {
      // Simple CRDT processing - no network logic

      if (msg.type === CrdtMessageType.DELETE_ENTITY) {
        entitiesShouldBeCleaned.push(msg.entityId)
        broadcastMessages.push(msg)
      } else {
        const entityState = engine.entityContainer.getEntityState(msg.entityId)

        // Skip updates from removed entities
        if (entityState === EntityState.Removed) continue

        // Entities with unknown state should update its entity state
        if (entityState === EntityState.Unknown) {
          engine.entityContainer.updateUsedEntity(msg.entityId)
        }
        // Only process component-related messages (not DELETE_ENTITY)
        if ('componentId' in msg) {
          const component = engine.getComponentOrNull(msg.componentId)

          if (component) {
            // Handle authoritative messages differently - they force the state regardless of timestamp
            const [conflictMessage, value] =
              msg.type === CrdtMessageType.AUTHORITATIVE_PUT_COMPONENT
                ? component.__forceUpdateFromCrdt(msg)
                : component.updateFromCrdt(msg)
            if (!conflictMessage) {
              // Add message to broadcast queue when no conflict
              broadcastMessages.push(msg)
              onProcessEntityComponentChange && onProcessEntityComponentChange(msg.entityId, msg.type, component, value)
            }
          } else {
            // Component not found - still broadcast for editor compatibility
            /* istanbul ignore next */
            broadcastMessages.push(msg)
          }
        }
      }
    }
    // the last stage of the syncrhonization is to delete the entities
    for (const entity of entitiesShouldBeCleaned) {
      for (const definition of engine.componentsIter()) {
        // TODO: check this with pato/pravus
        definition.entityDeleted(entity, true)
      }
      engine.entityContainer.updateRemovedEntity(entity)
      onProcessEntityComponentChange && onProcessEntityComponentChange(entity, CrdtMessageType.DELETE_ENTITY)
    }
  }

  /**
   * Simple CRDT message broadcasting - no network-specific logic
   */
  async function sendMessages(entitiesDeletedThisTick: Entity[]) {
    // Get messages from broadcast queue and component updates
    const crdtMessages = getMessages(broadcastMessages)
    const buffer = new ReadWriteByteBuffer()

    // Generate CRDT messages from component updates
    for (const component of engine.componentsIter()) {
      for (const message of component.getCrdtUpdates()) {
        const offset = buffer.currentWriteOffset()
        // Only create messages if there's a transport that will handle it
        if (transports.some((t) => t.filter(message))) {
          if (message.type === CrdtMessageType.PUT_COMPONENT) {
            PutComponentOperation.write(message.entityId, message.timestamp, message.componentId, message.data, buffer)
          } else if (message.type === CrdtMessageType.DELETE_COMPONENT) {
            DeleteComponent.write(message.entityId, component.componentId, message.timestamp, buffer)
          } else if (message.type === CrdtMessageType.APPEND_VALUE) {
            AppendValueOperation.write(message.entityId, message.timestamp, message.componentId, message.data, buffer)
          }
          crdtMessages.push({
            ...message,
            messageBuffer: buffer.buffer().subarray(offset, buffer.currentWriteOffset())
          })
        }
        if (onProcessEntityComponentChange) {
          const rawValue =
            message.type === CrdtMessageType.PUT_COMPONENT || message.type === CrdtMessageType.APPEND_VALUE
              ? component.get(message.entityId)
              : undefined

          onProcessEntityComponentChange(message.entityId, message.type, component, rawValue)
        }
      }
    }

    // Handle deleted entities
    for (const entityId of entitiesDeletedThisTick) {
      const offset = buffer.currentWriteOffset()
      DeleteEntity.write(entityId, buffer)

      crdtMessages.push({
        type: CrdtMessageType.DELETE_ENTITY,
        entityId,
        messageBuffer: buffer.buffer().subarray(offset, buffer.currentWriteOffset())
      })

      onProcessEntityComponentChange && onProcessEntityComponentChange(entityId, CrdtMessageType.DELETE_ENTITY)
    }

    // Simple transport broadcasting - no network-specific transforms
    for (const transport of transports) {
      const transportBuffer = new ReadWriteByteBuffer()

      for (const message of crdtMessages) {
        // Avoid echo messages
        if (message.transportId === transports.indexOf(transport)) continue

        // Check if transport wants this message
        if (transport.filter(message)) {
          transportBuffer.writeBuffer(message.messageBuffer, false)
        }
      }

      await transport.send(transportBuffer.toBinary())
    }
  }

  /**
   * @public
   * Add a transport to the crdt system
   */
  function addTransport(transport: Transport) {
    const id = transports.push(transport) - 1
    transport.onmessage = parseChunkMessage(id)
  }

  return {
    sendMessages,
    receiveMessages,
    addTransport
  }
}
