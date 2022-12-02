import { crdtProtocol, Message as CrdtMessage } from '@dcl/crdt'

import type { IEngine } from '../../engine'
import { Entity } from '../../engine/entity'
import { createByteBuffer } from '../../serialization/ByteBuffer'
import { ComponentOperation as Message } from '../../serialization/crdt/componentOperation'
import WireMessage from '../../serialization/wireMessage'
import { ReceiveMessage, TransportMessage, Transport } from './types'

export function crdtSceneSystem(engine: Pick<IEngine, 'getComponentOrNull'>) {
  const transports: Transport[] = []

  // CRDT Client
  const crdtClient = crdtProtocol<Uint8Array>()
  // Messages that we received at transport.onMessage waiting to be processed
  const receivedMessages: ReceiveMessage[] = []
  // Messages already processed by the engine but that we need to broadcast to other transports.
  const transportMessages: TransportMessage[] = []
  // Map of entities already processed at least once

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
      // TODO: do something if buffler.len>0
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
  async function receiveMessages() {
    const messagesToProcess = getMessages(receivedMessages)
    for (const transport of transports) {
      const buffer = createByteBuffer()
      for (const message of messagesToProcess) {
        const { data, timestamp, componentId, entity, type } = message
        const crdtMessage: CrdtMessage<Uint8Array> = {
          key1: entity as number,
          key2: componentId,
          data: data || null,
          timestamp: timestamp
        }
        const component = engine.getComponentOrNull(componentId)
        const current = crdtClient.processMessage(crdtMessage)
        /* istanbul ignore next */
        if (!component)
          // TODO: TEST
          continue
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

      if (buffer.size() && transport.resendOutdatedMessages) {
        await transport.send(buffer.toBinary())
      }
    }
  }

  /**
   * Iterates the dirty map and generates crdt messages to be send
   * @param dirtyMap a map of { entities: [componentId] }
   */
  async function createMessages(dirtyMap: Map<Entity, Set<number>>) {
    // CRDT Messages will be the merge between the recieved transport messages and the new crdt messages
    const crdtMessages = getMessages(transportMessages)
    const buffer = createByteBuffer()

    for (const [entity, componentsId] of dirtyMap) {
      for (const componentId of componentsId) {
        const component = engine.getComponentOrNull(componentId)
        /* istanbul ignore next */
        if (!component)
          // TODO: test coverage
          continue
        const entityComponent = component.has(entity)
          ? component.toBinary(entity).toBinary()
          : null
        const event = crdtClient.createEvent(
          entity as number,
          componentId,
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
      const message = transportBuffer.size()
        ? transportBuffer.toBinary()
        : new Uint8Array([])
      await transport.send(message)
    }
  }

  function addTransport(transport: Transport) {
    transports.push(transport)
    transport.onmessage = parseChunkMessage(transport.type)
    // TODO: pull messages from transport
    // TODO: send entities to transport
  }

  return {
    createMessages,
    receiveMessages,
    addTransport
  }
}
