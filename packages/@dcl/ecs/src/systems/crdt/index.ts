import { Entity, EntityState } from '../../engine/entity'
import type { ComponentDefinition } from '../../engine'
import type { PreEngine } from '../../engine/types'
import { ReadWriteByteBuffer } from '../../serialization/ByteBuffer'
import { AppendValueOperation, CrdtMessageProtocol } from '../../serialization/crdt'
import { DeleteComponent } from '../../serialization/crdt/deleteComponent'
import { DeleteEntity } from '../../serialization/crdt/deleteEntity'
import { PutComponentOperation } from '../../serialization/crdt/putComponent'
import { CrdtMessageType, CrdtMessageHeader } from '../../serialization/crdt/types'
import { ReceiveMessage, Transport, TransportMessage } from './types'

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

  // Messages that we received at transport.onMessage waiting to be processed
  const receivedMessages: ReceiveMessage[] = []
  // Messages already processed by the engine but that we need to broadcast to other transports.
  const broadcastMessages: TransportMessage[] = []
  // Messages receieved by a transport that were outdated. We need to correct them
  const outdatedMessages: TransportMessage[] = []

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

        if (header.type === CrdtMessageType.DELETE_COMPONENT) {
          const message = DeleteComponent.read(buffer)!
          receivedMessages.push({
            ...message,
            transportId,
            messageBuffer: buffer.buffer().subarray(offset, buffer.currentReadOffset())
          })
        } else if (header.type === CrdtMessageType.PUT_COMPONENT) {
          const message = PutComponentOperation.read(buffer)!
          receivedMessages.push({
            ...message,
            transportId,
            messageBuffer: buffer.buffer().subarray(offset, buffer.currentReadOffset())
          })
        } else if (header.type === CrdtMessageType.DELETE_ENTITY) {
          const message = DeleteEntity.read(buffer)!
          receivedMessages.push({
            ...message,
            transportId,
            messageBuffer: buffer.buffer().subarray(offset, buffer.currentReadOffset())
          })
        } else if (header.type === CrdtMessageType.APPEND_VALUE) {
          const message = AppendValueOperation.read(buffer)!
          receivedMessages.push({
            ...message,
            transportId,
            messageBuffer: buffer.buffer().subarray(offset, buffer.currentReadOffset())
          })

          // Unknown message, we skip it
        } else {
          // consume the message
          buffer.incrementReadOffset(header.length)
        }
      }
      // TODO: do something if buffler.len>0
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
    const bufferForOutdated = new ReadWriteByteBuffer()
    const entitiesShouldBeCleaned: Entity[] = []

    for (const msg of messagesToProcess) {
      if (msg.type === CrdtMessageType.DELETE_ENTITY) {
        entitiesShouldBeCleaned.push(msg.entityId)
      } else {
        const entityState = engine.entityContainer.getEntityState(msg.entityId)

        // Skip updates from removed entityes
        if (entityState === EntityState.Removed) continue

        // Entities with unknown entities should update its entity state
        if (entityState === EntityState.Unknown) {
          engine.entityContainer.updateUsedEntity(msg.entityId)
        }

        const component = engine.getComponentOrNull(msg.componentId)

        if (component) {
          const [conflictMessage, value] = component.updateFromCrdt(msg)

          if (conflictMessage) {
            const offset = bufferForOutdated.currentWriteOffset()

            if (conflictMessage.type === CrdtMessageType.PUT_COMPONENT) {
              PutComponentOperation.write(
                msg.entityId,
                conflictMessage.timestamp,
                conflictMessage.componentId,
                conflictMessage.data,
                bufferForOutdated
              )
            } else if (conflictMessage.type === CrdtMessageType.DELETE_COMPONENT) {
              DeleteComponent.write(msg.entityId, component.componentId, conflictMessage.timestamp, bufferForOutdated)
            }

            outdatedMessages.push({
              ...msg,
              messageBuffer: bufferForOutdated.buffer().subarray(offset, bufferForOutdated.currentWriteOffset())
            })
          } else {
            // Add message to transport queue to be processed by others transports
            broadcastMessages.push(msg)

            onProcessEntityComponentChange && onProcessEntityComponentChange(msg.entityId, msg.type, component, value)
          }
        }
      }
    }

    // the last stage of the syncrhonization is to delete the entities
    for (const entity of entitiesShouldBeCleaned) {
      // If we tried to resend outdated message and the entity was deleted before, we avoid sending them.
      for (let i = outdatedMessages.length - 1; i >= 0; i--) {
        if (outdatedMessages[i].entityId === entity && outdatedMessages[i].type !== CrdtMessageType.DELETE_ENTITY) {
          outdatedMessages.splice(i, 1)
        }
      }

      for (const definition of engine.componentsIter()) {
        definition.entityDeleted(entity, false)
      }

      engine.entityContainer.updateRemovedEntity(entity)

      onProcessEntityComponentChange && onProcessEntityComponentChange(entity, CrdtMessageType.DELETE_ENTITY)
    }
  }

  /**
   * Iterates the dirty map and generates crdt messages to be send
   */
  async function sendMessages(entitiesDeletedThisTick: Entity[]) {
    // CRDT Messages will be the merge between the recieved transport messages and the new crdt messages
    const crdtMessages = getMessages(broadcastMessages)
    const outdatedMessagesBkp = getMessages(outdatedMessages)
    const buffer = new ReadWriteByteBuffer()

    for (const component of engine.componentsIter()) {
      for (const message of component.getCrdtUpdates()) {
        const offset = buffer.currentWriteOffset()

        // Avoid creating messages if there is no transport that will handle it
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

          if (onProcessEntityComponentChange) {
            const rawValue =
              message.type === CrdtMessageType.PUT_COMPONENT || message.type === CrdtMessageType.APPEND_VALUE
                ? component.get(message.entityId)
                : undefined

            onProcessEntityComponentChange(message.entityId, message.type, component, rawValue)
          }
        }
      }
    }

    // After all updates, I execute the DeletedEntity messages
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

    // Send CRDT messages to transports
    const transportBuffer = new ReadWriteByteBuffer()
    for (const index in transports) {
      const transportIndex = Number(index)
      const transport = transports[transportIndex]
      transportBuffer.resetBuffer()
      // First we need to send all the messages that were outdated from a transport
      // So we can fix their crdt state
      for (const message of outdatedMessagesBkp) {
        if (
          message.transportId === transportIndex &&
          // TODO: This is an optimization, the state should converge anyway, whatever the message is sent.
          // Avoid sending multiple messages for the same entity-componentId
          !crdtMessages.find(
            (m) =>
              m.entityId === message.entityId &&
              // TODO: as any, with multiple type of messages, it should have many checks before the check for similar messages
              (m as any).componentId &&
              (m as any).componentId === (message as any).componentId
          )
        ) {
          transportBuffer.writeBuffer(message.messageBuffer, false)
        }
      }
      // Then we send all the new crdtMessages that the transport needs to process
      for (const message of crdtMessages) {
        if (message.transportId !== transportIndex && transport.filter(message)) {
          transportBuffer.writeBuffer(message.messageBuffer, false)
        }
      }
      const message = transportBuffer.currentWriteOffset() ? transportBuffer.toBinary() : new Uint8Array([])
      await transport.send(message)
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
