import * as CRDT from '@dcl/crdt'

import type { IEngine } from '../../engine'
import { Entity, EntityUtils } from '../../engine/entity'
import { createByteBuffer } from '../../serialization/ByteBuffer'
import { ComponentOperation } from '../../serialization/messages/componentOperation'
import { DeleteEntity } from '../../serialization/messages/deleteEntity'
import { DeleteComponentMessageBody, PutComponentMessageBody, WireMessageEnum, WireMessageHeader } from '../../serialization/types'
import WireMessage from '../../serialization/wireMessage'
import { ReceiveMessage, Transport, TransportMessage } from './types'

export function crdtSceneSystem(
  engine: Pick<
    IEngine,
    'getComponentOrNull' | 'getComponent' | 'componentsDefinition'
  >
) {
  const transports: Transport[] = []

  // CRDT Client
  const crdtClient = CRDT.crdtProtocol<Uint8Array>({
    entityId: EntityUtils.entityId,
    entityNumber: EntityUtils.entityNumber,
    entityVersion: EntityUtils.entityVersion
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
        reading: { buffer: chunkMessage, currentOffset: 0 }
      })

      let header: WireMessageHeader | null
      while (header = WireMessage.getHeader(buffer)) {
        const offset = buffer.currentReadOffset()

        if (header.type === WireMessageEnum.DELETE_COMPONENT) {
          const message = ComponentOperation.read(buffer) as DeleteComponentMessageBody
          receivedMessages.push({
            ...header,
            ...message,
            transportId,
            messageBuffer: buffer
              .buffer()
              .subarray(offset, buffer.currentReadOffset())
          })

        } else if (header.type === WireMessageEnum.PUT_COMPONENT) {
          const message = ComponentOperation.read(buffer) as PutComponentMessageBody
          receivedMessages.push({
            ...header,
            ...message,
            transportId,
            messageBuffer: buffer
              .buffer()
              .subarray(offset, buffer.currentReadOffset())
          })
        } else if (header.type === WireMessageEnum.DELETE_ENTITY) {
          const message = DeleteEntity.read(buffer)!
          receivedMessages.push({
            ...header,
            ...message,
            transportId,
            messageBuffer: buffer
              .buffer()
              .subarray(offset, buffer.currentReadOffset())
          })

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

    for (const msg of messagesToProcess) {
      if (msg.type === WireMessageEnum.DELETE_ENTITY) {
        crdtClient.processMessage({
          type: CRDT.MessageType.MT_AddGSet,
          entityId: msg.entityId
        })
      } else {
        const crdtMessage: CRDT.LWWMessage<Uint8Array> = {
          type: CRDT.MessageType.MT_LWW,
          entityId: msg.entityId,
          componentId: msg.componentId,
          data: msg.type === WireMessageEnum.PUT_COMPONENT ? msg.data : null,
          timestamp: msg.timestamp
        }
        const component = engine.getComponentOrNull(msg.componentId)

        if (component?.isDirty(msg.entityId)) {
          crdtClient.createEvent(
            msg.entityId,
            component._id,
            component.toBinaryOrNull(msg.entityId)?.toBinary() || null
          )
        }
        const current = crdtClient.processMessage(crdtMessage)

        if (!component) {
          continue
        }
        // CRDT outdated message. Resend this message to the transport
        // To do this we add this message to a queue that will be processed at the end of the update tick
        if (crdtMessage !== current) {
          const offset = bufferForOutdated.currentWriteOffset()
          const type = ComponentOperation.getType(component, msg.entityId)

          if (current.type === CRDT.MessageType.MT_AddGSet) {
            DeleteEntity.write(current.entityId as Entity, bufferForOutdated)
            outdatedMessages.push({
              ...msg,
              messageBuffer: bufferForOutdated
                .buffer()
                .subarray(offset, bufferForOutdated.currentWriteOffset())
            })
          } else {
            const ts = current.timestamp
            ComponentOperation.write(type, msg.entityId, ts, component, bufferForOutdated)
            outdatedMessages.push({
              ...msg,
              messageBuffer: bufferForOutdated
                .buffer()
                .subarray(offset, bufferForOutdated.currentWriteOffset())
            })
          }
        } else {
          // Add message to transport queue to be processed by others transports
          broadcastMessages.push(msg)

          // Process CRDT Message
          if (msg.type === WireMessageEnum.DELETE_COMPONENT) {
            component.deleteFrom(msg.entityId, false)
          } else {
            const opts = {
              reading: { buffer: msg.data!, currentOffset: 0 }
            }
            const data = createByteBuffer(opts)
            component.upsertFromBinary(msg.entityId, data, false)
          }
        }
      }
    }
  }

  function getDirtyMap() {
    const dirtySet = new Map<Entity, Set<number>>()
    for (const [componentId, definition] of engine.componentsDefinition) {
      for (const entity of definition.dirtyIterator()) {
        if (!dirtySet.has(entity)) {
          dirtySet.set(entity, new Set())
        }
        dirtySet.get(entity)!.add(componentId)
      }
    }
    return dirtySet
  }

  /**
   * Updates CRDT state of the current engine dirty components
   */
  function updateState() {
    const dirtyEntities = getDirtyMap()
    for (const [entity, componentsId] of dirtyEntities) {
      for (const componentId of componentsId) {
        const component = engine.getComponent(componentId)
        const componentValue =
          component.toBinaryOrNull(entity)?.toBinary() ?? null
        crdtClient.createEvent(entity as number, componentId, componentValue)
      }
    }
    return dirtyEntities
  }

  /**
   * Iterates the dirty map and generates crdt messages to be send
   */
  async function sendMessages(dirtyEntities: Map<Entity, Set<number>>) {
    // CRDT Messages will be the merge between the recieved transport messages and the new crdt messages
    const crdtMessages = getMessages(broadcastMessages)
    const outdatedMessagesBkp = getMessages(outdatedMessages)
    const buffer = createByteBuffer()
    for (const [entity, componentsId] of dirtyEntities) {
      for (const componentId of componentsId) {
        // Component will be always defined here since dirtyMap its an iterator of engine.componentsDefinition
        const component = engine.getComponent(componentId)
        const { timestamp, data } = crdtClient
          .getState()
          .get(entity as number)!
          .get(componentId)!
        const offset = buffer.currentWriteOffset()
        const type: WireMessageEnum = ComponentOperation.getType(component, entity)
        const transportMessage = {
          type,
          timestamp,
          entityId: entity,
          componentId
        }

        // Avoid creating messages if there is no transport that will handle it
        if (transports.some((t) => t.filter(transportMessage))) {
          ComponentOperation.write(type, entity, timestamp, component, buffer)
          crdtMessages.push({
            ...transportMessage,
            messageBuffer: buffer
              .buffer()
              .subarray(offset, buffer.currentWriteOffset())
          })
        }
      }
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
          message.transportId === transportIndex

          // TODO: fix this
          // &&
          // // Avoid sending multiple messages for the same entity-componentId
          // !crdtMessages.find(
          //   (m) =>
          //     m.entityId === message.entityId &&
          //     m.type !==
          //     m.componentId === message.componentId
          // )
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
