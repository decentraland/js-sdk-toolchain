import { crdtProtocol } from '@dcl/crdt'
import {
  ComponentDataMessage,
  CRDTMessageType,
  ProcessMessageResultType
} from '@dcl/crdt/dist/types'

import { Entity, EntityState, EntityUtils } from '../../engine/entity'
import type { ComponentDefinition, IEngine } from '../../engine'
import { createByteBuffer } from '../../serialization/ByteBuffer'
import CrdtMessageProtocol from '../../serialization/crdt'
import { DeleteComponent } from '../../serialization/crdt/deleteComponent'
import { DeleteEntity } from '../../serialization/crdt/deleteEntity'
import { PutComponentOperation } from '../../serialization/crdt/putComponent'
import {
  CrdtMessageType,
  CrdtMessageHeader
} from '../../serialization/crdt/types'
import { ReceiveMessage, Transport, TransportMessage } from './types'

/**
 * @public
 */
export type OnChangeFunction = (
  entity: Entity,
  operation: CrdtMessageType,
  component?: ComponentDefinition<any>
) => void

export function crdtSceneSystem(
  engine: Pick<
    IEngine,
    'getComponentOrNull' | 'getComponent' | 'entityContainer' | 'componentsIter'
  >,
  onProcessEntityComponentChange: OnChangeFunction | null
) {
  const transports: Transport[] = []

  // CRDT Client
  const crdtClient = crdtProtocol<Uint8Array>({
    toEntityId: EntityUtils.toEntityId,
    fromEntityId: EntityUtils.fromEntityId
  })
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
      const buffer = createByteBuffer({
        buffer: chunkMessage
      })

      let header: CrdtMessageHeader | null
      while ((header = CrdtMessageProtocol.getHeader(buffer))) {
        const offset = buffer.currentReadOffset()

        if (header.type === CrdtMessageType.DELETE_COMPONENT) {
          const message = DeleteComponent.read(buffer)!
          receivedMessages.push({
            ...header,
            ...message,
            transportId,
            messageBuffer: buffer
              .buffer()
              .subarray(offset, buffer.currentReadOffset())
          })
        } else if (header.type === CrdtMessageType.PUT_COMPONENT) {
          const message = PutComponentOperation.read(buffer)!
          receivedMessages.push({
            ...header,
            ...message,
            transportId,
            messageBuffer: buffer
              .buffer()
              .subarray(offset, buffer.currentReadOffset())
          })
        } else if (header.type === CrdtMessageType.DELETE_ENTITY) {
          const message = DeleteEntity.read(buffer)!
          receivedMessages.push({
            ...header,
            ...message,
            transportId,
            messageBuffer: buffer
              .buffer()
              .subarray(offset, buffer.currentReadOffset())
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
    const bufferForOutdated = createByteBuffer()
    const entitiesShouldBeCleaned: Entity[] = []

    for (const msg of messagesToProcess) {
      // TODO: emit delete entity to el onCrdtMessage
      if (msg.type === CrdtMessageType.DELETE_ENTITY) {
        crdtClient.processMessage({
          type: CRDTMessageType.CRDTMT_DeleteEntity,
          entityId: msg.entityId
        })
        entitiesShouldBeCleaned.push(msg.entityId)
      } else {
        // TODO: emit pu/delete component to el onCrdtMessage
        const crdtMessage: ComponentDataMessage<Uint8Array> = {
          type: CRDTMessageType.CRDTMT_PutComponentData,
          entityId: msg.entityId,
          componentId: msg.componentId,
          data: msg.type === CrdtMessageType.PUT_COMPONENT ? msg.data : null,
          timestamp: msg.timestamp
        }

        const entityState = engine.entityContainer.getEntityState(msg.entityId)
        // Skip updates from removed entityes
        if (entityState === EntityState.Removed) continue

        // Entities with unknown entities should update its entity state
        if (entityState === EntityState.Unknown) {
          engine.entityContainer.updateUsedEntity(msg.entityId)
        }

        const component = engine.getComponentOrNull(msg.componentId)

        // The state isn't updated because the dirty was set
        //  out of the block of systems update between `receiveMessage` and `updateState`
        if (component?.isDirty(msg.entityId)) {
          crdtClient.createComponentDataEvent(
            component._id,
            msg.entityId,
            component.toBinaryOrNull(msg.entityId)?.toBinary() || null
          )
        }
        const processResult = crdtClient.processMessage(crdtMessage)

        if (!component) {
          continue
        }

        switch (processResult) {
          case ProcessMessageResultType.StateUpdatedTimestamp:
          case ProcessMessageResultType.StateUpdatedData:
            // Add message to transport queue to be processed by others transports
            broadcastMessages.push(msg)

            // Process CRDT Message
            if (msg.type === CrdtMessageType.DELETE_COMPONENT) {
              component.deleteFrom(msg.entityId, false)
            } else {
              const data = createByteBuffer({
                buffer: msg.data!,
                readingOffset: 0
              })
              component.upsertFromBinary(msg.entityId, data, false)
            }

            onProcessEntityComponentChange &&
              onProcessEntityComponentChange(msg.entityId, msg.type, component)

            break

          // CRDT outdated message. Resend this message to the transport
          // To do this we add this message to a queue that will be processed at the end of the update tick
          case ProcessMessageResultType.StateOutdatedData:
          case ProcessMessageResultType.StateOutdatedTimestamp:
            const current = crdtClient
              .getState()
              .components.get(msg.componentId)
              ?.get(msg.entityId)
            if (current) {
              const offset = bufferForOutdated.currentWriteOffset()

              const ts = current.timestamp
              if (component.has(msg.entityId)) {
                PutComponentOperation.write(
                  msg.entityId,
                  ts,
                  component,
                  bufferForOutdated
                )
              } else {
                DeleteComponent.write(
                  msg.entityId,
                  component._id,
                  ts,
                  bufferForOutdated
                )
              }

              outdatedMessages.push({
                ...msg,
                messageBuffer: bufferForOutdated
                  .buffer()
                  .subarray(offset, bufferForOutdated.currentWriteOffset())
              })
            }
            break

          case ProcessMessageResultType.NoChanges:
          case ProcessMessageResultType.EntityDeleted:
          case ProcessMessageResultType.EntityWasDeleted:
          default:
            break
        }
      }
    }

    // TODO: emit delete entity to el onCrdtMessage
    for (const entity of entitiesShouldBeCleaned) {
      // If we tried to resend outdated message and the entity was deleted before, we avoid sending them.
      for (let i = outdatedMessages.length - 1; i >= 0; i--) {
        if (outdatedMessages[i].entityId === entity) {
          outdatedMessages.splice(i, 1)
        }
      }

      for (const definition of engine.componentsIter()) {
        definition.deleteFrom(entity, false)
      }

      engine.entityContainer.updateRemovedEntity(entity)

      onProcessEntityComponentChange &&
        onProcessEntityComponentChange(entity, CrdtMessageType.DELETE_ENTITY)
    }
  }

  /**
   * Updates CRDT state of the current engine dirty components
   *
   * TODO: optimize this function allocations using a bitmap
   * TODO: unify this function with sendMessages
   */
  function updateState() {
    const dirtyMap = new Map<ComponentDefinition<unknown>, Array<Entity>>()
    for (const component of engine.componentsIter()) {
      let entitySet: Array<Entity> | null = null
      for (const entity of component.dirtyIterator()) {
        if (!entitySet) {
          entitySet = []
          dirtyMap.set(component, entitySet)
        }

        // TODO: reuse shared writer to prevent extra allocations of toBinary
        const componentValue =
          component.toBinaryOrNull(entity)?.toBinary() ?? null

        // TODO: do not emit event if componentValue equals the value didn't change
        // if update goes bad, the entity doesn't accept put anymore (it's added to deleted entities set)
        if (
          crdtClient.createComponentDataEvent(
            component._id,
            entity as number,
            componentValue
          ) === null
        ) {
          component.deleteFrom(entity, false)
        } else {
          entitySet.push(entity)

          onProcessEntityComponentChange &&
            onProcessEntityComponentChange(
              entity,
              componentValue === null
                ? CrdtMessageType.DELETE_COMPONENT
                : CrdtMessageType.PUT_COMPONENT,
              component
            )
        }
      }
    }
    return dirtyMap
  }

  /**
   * Iterates the dirty map and generates crdt messages to be send
   */
  async function sendMessages(
    dirtyEntities: Map<ComponentDefinition<unknown>, Array<Entity>>,
    deletedEntities: Entity[]
  ) {
    // CRDT Messages will be the merge between the recieved transport messages and the new crdt messages
    const crdtMessages = getMessages(broadcastMessages)
    const outdatedMessagesBkp = getMessages(outdatedMessages)
    const buffer = createByteBuffer()
    for (const [component, entities] of dirtyEntities) {
      for (const entity of entities) {
        // Component will be always defined here since dirtyMap its an iterator of engine.componentsDefinition
        const { timestamp } = crdtClient
          .getState()
          .components.get(component._id)!
          .get(entity as number)!

        const offset = buffer.currentWriteOffset()
        const type: CrdtMessageType = component.has(entity)
          ? CrdtMessageType.PUT_COMPONENT
          : CrdtMessageType.DELETE_COMPONENT
        const transportMessage = {
          type,
          entityId: entity,
          componentId: component._id,
          timestamp
        }

        // Avoid creating messages if there is no transport that will handle it
        if (transports.some((t) => t.filter(transportMessage))) {
          if (transportMessage.type === CrdtMessageType.PUT_COMPONENT) {
            PutComponentOperation.write(entity, timestamp, component, buffer)
          } else {
            DeleteComponent.write(entity, component._id, timestamp, buffer)
          }

          crdtMessages.push({
            ...transportMessage,
            messageBuffer: buffer
              .buffer()
              .subarray(offset, buffer.currentWriteOffset())
          })
        }
      }
    }

    // After all updates, I execute the DeletedEntity messages
    for (const entityId of deletedEntities) {
      crdtClient.createDeleteEntityEvent(entityId)

      const offset = buffer.currentWriteOffset()
      DeleteEntity.write(entityId, buffer)
      crdtMessages.push({
        type: CrdtMessageType.DELETE_ENTITY,
        entityId,
        messageBuffer: buffer
          .buffer()
          .subarray(offset, buffer.currentWriteOffset())
      })
    }

    // Send CRDT messages to transports
    const transportBuffer = createByteBuffer()
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
        if (
          message.transportId !== transportIndex &&
          transport.filter(message)
        ) {
          transportBuffer.writeBuffer(message.messageBuffer, false)
        }
      }
      const message = transportBuffer.size()
        ? transportBuffer.toBinary()
        : new Uint8Array([])
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

  /**
   * @public
   * @returns returns the crdt state
   */
  function getCrdt() {
    return crdtClient.getState()
  }

  return {
    getCrdt,
    sendMessages,
    receiveMessages,
    addTransport,
    updateState
  }
}
