import { crdtProtocol, Message as CrdtMessage } from '@dcl/crdt'

import type { IEngine } from '../../engine'
import { Entity, EntityContainer } from '../../engine/entity'
import { createByteBuffer } from '../../serialization/ByteBuffer'
import { ComponentOperation as Message } from '../../serialization/crdt/componentOperation'
import WireMessage from '../../serialization/wireMessage'
import { ReceiveMessage, TransportMessage, Transport } from './types'

export function crdtSceneSystem(
  engine: Pick<
    IEngine,
    'getComponentOrNull' | 'getComponent' | 'componentsDefinition'
  >
) {
  const transports: Transport[] = []

  // CRDT Client
  const crdtClient = crdtProtocol<Uint8Array>()
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
          transportId,
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

      if (!component) {
        continue
      }
      // CRDT outdated message. Resend this message to the transport
      // To do this we add this message to a queue that will be processed at the end of the update tick
      console.dir({ crdtMessage, current })
      if (crdtMessage !== current) {
        const offset = bufferForOutdated.currentWriteOffset()
        const type = WireMessage.getType(component, entity)
        const ts = current.timestamp
        Message.write(type, entity, ts, component, bufferForOutdated)
        outdatedMessages.push({
          ...message,
          timestamp: current.timestamp,
          messageBuffer: bufferForOutdated
            .buffer()
            .subarray(offset, bufferForOutdated.currentWriteOffset())
        })
      } else {
        // Add message to transport queue to be processed by others transports
        broadcastMessages.push(message)

        // Process CRDT Message
        if (type === WireMessage.Enum.DELETE_COMPONENT) {
          component.deleteFrom(entity, false)
        } else {
          const opts = {
            reading: { buffer: message.data!, currentOffset: 0 }
          }
          const data = createByteBuffer(opts)
          component.upsertFromBinary(message.entity, data, false)
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
    for (const [entity, componentsId] of getDirtyMap()) {
      for (const componentId of componentsId) {
        const component = engine.getComponent(componentId)
        const componentValue =
          component.toBinaryOrNull(entity)?.toBinary() ?? null
        crdtClient.createEvent(entity as number, componentId, componentValue)
      }
    }
  }

  /**
   * Iterates the dirty map and generates crdt messages to be send
   */
  async function sendMessages() {
    // CRDT Messages will be the merge between the recieved transport messages and the new crdt messages
    const crdtMessages = getMessages(broadcastMessages)
    const outdatedMessagesBkp = getMessages(outdatedMessages)
    const buffer = createByteBuffer()
    console.dir({ getDirtyMap: getDirtyMap() })
    for (const [entity, componentsId] of getDirtyMap()) {
      for (const componentId of componentsId) {
        // Component will be always defined here since dirtyMap its an iterator of engine.componentsDefinition
        const component = engine.getComponent(componentId)
        const { timestamp } = crdtClient
          .getState()
          .get(entity as number)!
          .get(componentId)!
        const offset = buffer.currentWriteOffset()
        const type = WireMessage.getType(component, entity)
        const transportMessage: Omit<TransportMessage, 'messageBuffer'> = {
          type,
          componentId,
          entity,
          timestamp
        }
        // Avoid creating messages if there is no transport that will handle it
        if (transports.some((t) => t.filter(transportMessage))) {
          console.log('PUSH: ', { entity, id: componentId })
          Message.write(type, entity, timestamp, component, buffer)
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
      console.log({ outdatedMessagesBkp, crdtMessages, broadcastMessages })
      for (const message of outdatedMessagesBkp) {
        if (
          message.transportId === transportIndex &&
          // Avoid sending multiple messages for the same entity-componentId
          !crdtMessages.find(
            (m) =>
              m.entity === message.entity &&
              m.componentId === message.componentId
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
          console.log(
            { message },
            engine.getComponent(message.componentId).get(message.entity)
          )
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
