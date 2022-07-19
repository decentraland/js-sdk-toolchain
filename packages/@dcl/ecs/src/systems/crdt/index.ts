import { crdtProtocol, Message as CrdtMessage } from '@dcl/crdt'

import type { PreEngine } from '../../engine'
import { Entity } from '../../engine/entity'
import { createByteBuffer } from '../../serialization/ByteBuffer'
import { ComponentOperation as Message } from '../../serialization/crdt/componentOperation'
import WireMessage from '../../serialization/wireMessage'
import { Transport } from './transports/types'
import { ReceiveMessage, TransportMessage } from './types'
import CrdtUtils from './utils'

export function crdtSceneSystem({
  engine,
  transports
}: {
  engine: PreEngine
  transports: Transport[]
}) {
  // CRDT Client
  const crdtClient = crdtProtocol<Uint8Array>()
  // Messages that we received at transport.onMessage waiting to be processed
  const receivedMessages: ReceiveMessage[] = []
  // Messages already processed by the engine but that we need to broadcast to other transports.
  const transportMessages: TransportMessage[] = []
  // Map of entities already processed at least once

  transports.forEach(
    (transport) => (transport.onmessage = parseChunkMessage(transport.type))
  )

  /**
   *
   * @param transportType tranport id to identiy messages
   * @returns a function to process received messages
   */
  function parseChunkMessage(transportType: string) {
    /**
     * Receives a chunk of binary messages and stores all the valid
     * Component Operation Messages at messages queue
     * @param chunkMessage A chunk of binary messages
     */
    return function parseChunkMessage(chunkMessage: Uint8Array) {
      const buffer = createByteBuffer({
        reading: { buffer: chunkMessage, currentOffset: 0 }
      })

      while (WireMessage.validate(buffer)) {
        const offset = buffer.currentReadOffset()
        const message = Message.read(buffer)!

        const { type, entity, componentId, data, timestamp } = message
        receivedMessages.push({
          type,
          entity,
          componentId,
          data,
          timestamp,
          transportType,
          messageBuffer: buffer
            .buffer()
            .subarray(offset, buffer.currentReadOffset())
        })
      }
    }
  }

  /**
   * Return and clear the messaes queue
   * @returns messages recieved by the transport to process on the next tick
   */
  function getMessages<T = unknown>(value: T[]) {
    const messagesToProcess = Array.from(value)
    value.length = 0
    return messagesToProcess
  }

  /**
   * This fn will be called on every tick.
   * Process all the messages queue received by the transport
   */
  function receiveMessages() {
    const messagesToProcess = getMessages(receivedMessages)
    for (const transport of transports) {
      const buffer = createByteBuffer()
      for (const message of messagesToProcess) {
        const { data, timestamp, componentId, entity, type } = message
        const crdtMessage: CrdtMessage<Uint8Array> = {
          key1: entity, 
          key2: componentId,
          data: data || null,
          timestamp: timestamp
        }
        const component = engine.getComponent(componentId)
        const current = crdtClient.processMessage(crdtMessage)

        // CRDT outdated message. Resend this message through the wire
        if (crdtMessage !== current) {
          const type = component.has(entity)
            ? WireMessage.Enum.PUT_COMPONENT
            : WireMessage.Enum.DELETE_COMPONENT
          Message.write(type, entity, current.timestamp, component, buffer)
        } else {
          // Process CRDT Message
          if (type === WireMessage.Enum.DELETE_COMPONENT) {
            component.deleteFrom(entity)
          } else {
            const opts = {
              reading: { buffer: message.data!, currentOffset: 0 }
            }
            const bb = createByteBuffer(opts)

            // Update engine component
            component.upsertFromBinary(message.entity, bb)
            component.clearDirty()
          }
          // Add message to transport queue to be processed by others transports
          transportMessages.push(message)
        }
      }

      if (buffer.size()) {
        transport.send(buffer.toBinary())
      }
    }
  }

  /**
   * Iterates the dirty map and generates crdt messages to be send
   * @param dirtyMap a map of { entities: [componentId] }
   */
  function createMessages(dirtyMap: Map<Entity, Set<number>>) {
    // CRDT Messages will be the merge between the recieved transport messages and the new crdt messages
    const crdtMessages = getMessages(transportMessages)
    const buffer = createByteBuffer()

    for (const [entity, componentsId] of dirtyMap) {
      for (const componentId of componentsId) {
        const component = engine.getComponent(componentId)
        const entityComponent = component.has(entity)
          ? component.toBinary(entity).toBinary()
          : null
        const event = crdtClient.createEvent(
          entity, componentId,
          entityComponent
        )
        const offset = buffer.currentWriteOffset()
        const type = component.has(entity)
          ? WireMessage.Enum.PUT_COMPONENT
          : WireMessage.Enum.DELETE_COMPONENT
        const transportMessage: Omit<TransportMessage, 'messageBuffer'> = {
          type,
          componentId,
          entity,
          timestamp: event.timestamp
        }
        if (transports.some((t) => t.filter(transportMessage))) {
          Message.write(type, entity, event.timestamp, component, buffer)
          crdtMessages.push({
            ...transportMessage,
            messageBuffer: buffer
              .buffer()
              .subarray(offset, buffer.currentWriteOffset())
          })
        }
      }
    }

    // Send messages to transports
    const transportBuffer = createByteBuffer()
    for (const transport of transports) {
      transportBuffer.resetBuffer()
      for (const message of crdtMessages) {
        if (transport.filter(message)) {
          transportBuffer.writeBuffer(message.messageBuffer, false)
        }
      }
      if (transportBuffer.size()) {
        transport.send(transportBuffer.toBinary())
      }
    }
  }

  return {
    createMessages,
    receiveMessages
  }
}
