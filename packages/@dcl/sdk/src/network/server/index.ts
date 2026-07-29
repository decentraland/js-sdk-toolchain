import {
  IEngine,
  Entity,
  CrdtMessageType,
  CrdtMessageBody,
  ProcessMessageResultType,
  ComponentType,
  PutNetworkComponentOperation
} from '@dcl/ecs'
import { CommsMessage } from '../binary-message-bus'
import * as codec from '../codec'
import { AUTH_SERVER_PEER_ID, DEBUG_NETWORK_MESSAGES } from '../constants'
import { type BinaryMessageBus } from '../binary-message-bus'
import {
  ByteBuffer,
  components,
  ReadWriteByteBuffer,
  DeleteComponentNetwork,
  LastWriteWinElementSetComponentDefinition,
  GrowOnlyValueSetComponentDefinition,
  ComponentDefinition,
  InternalBaseComponent
} from '../ecs-adapter'
import { createNetworkEntityIndex } from '../entity-index'

export interface ServerValidationConfig {
  engine: IEngine
  binaryMessageBus: ReturnType<typeof BinaryMessageBus>
}

export function createServerValidator(config: ServerValidationConfig) {
  const { engine, binaryMessageBus } = config

  const NetworkEntity = components.NetworkEntity(engine)
  const CreatedBy = components.CreatedBy(engine)
  const NetworkParent = components.NetworkParent(engine)

  function supportsCorrections<T>(
    component: ComponentDefinition<T>
  ): component is LastWriteWinElementSetComponentDefinition<T> | GrowOnlyValueSetComponentDefinition<T> {
    return (
      (component.componentType === ComponentType.LastWriteWinElementSet ||
        component.componentType === ComponentType.GrowOnlyValueSet) &&
      'getCrdtState' in component
    )
  }

  const findNetworkEntity = createNetworkEntityIndex(engine, NetworkEntity)

  function findOrCreateNetworkEntity(message: codec.NetworkMessage, sender: string, isServer: boolean): Entity {
    const existingEntity = findNetworkEntity(message.networkId, message.entityId)

    if (existingEntity) {
      return existingEntity
    }

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

  /**
   * Translates one network message into its local form, serialized straight into
   * `destination`. A conversion that throws does so before writing anything, so a
   * failure never leaves half a message behind.
   */
  function convertNetworkToRegularMessage(
    networkMessage: codec.NetworkMessage,
    localEntityId: Entity,
    destination: ByteBuffer,
    forceCorrections = false
  ): CrdtMessageBody | null {
    try {
      return codec.networkMessageToLocal(networkMessage, localEntityId, destination, NetworkParent, forceCorrections)
    } catch (error) {
      console.error('Error converting network message:', error)
      return null
    }
  }

  /**
   * Everything a peer asks the authoritative world to change goes through here.
   * A type this function does not name is refused: a permissive fallthrough turns
   * every message the protocol grows into an unaudited write.
   *
   * ponytail: authority is per-component (`validateBeforeChange`) plus CreatedBy
   * ownership on entity deletion. The sync mode the old TODO promised
   * ('all' | 'owner' | 'server') does not exist on this branch — `SyncComponents`
   * carries a bare `componentIds: number[]` and nothing anywhere reads a mode — so
   * there is nothing to enforce. Upgrade path: add the mode to the SyncComponents
   * schema, then gate the PUT/DELETE_COMPONENT arm on it before the dry run.
   */
  function validateMessagePermissions(message: CrdtMessageBody, sender: string, localEntityId: Entity): boolean {
    if (!sender || sender === AUTH_SERVER_PEER_ID) {
      return false // Server shouldn't send messages to itself
    }

    switch (message.type) {
      case CrdtMessageType.PUT_COMPONENT:
      case CrdtMessageType.DELETE_COMPONENT: {
        const component = engine.getComponent(message.componentId) as InternalBaseComponent<unknown>
        const buf = 'data' in message ? new ReadWriteByteBuffer(message.data) : null
        const value = buf ? component.schema.deserialize(buf) : null
        const dryRunCRDT = component.__dry_run_updateFromCrdt(message)
        const validCRDT = [
          ProcessMessageResultType.StateUpdatedData,
          ProcessMessageResultType.StateUpdatedTimestamp,
          ProcessMessageResultType.EntityDeleted
        ].includes(dryRunCRDT)
        const createdBy = CreatedBy.getOrNull(localEntityId)

        return !!(
          validCRDT &&
          component.__run_validateBeforeChange(
            message.entityId,
            value,
            sender,
            createdBy?.address ?? AUTH_SERVER_PEER_ID
          )
        )
      }

      case CrdtMessageType.DELETE_ENTITY:
      case CrdtMessageType.DELETE_ENTITY_NETWORK:
        // Destroying an entity is only the creator's call. The server may do it too,
        // which it cannot reach today: a message from itself is refused above.
        // `localEntityId` and not `message.entityId`, because the network variant
        // still names the sender's entity id rather than the local one.
        //
        // ponytail: a delete naming an entity the server has never seen still passes,
        // because `findOrCreateNetworkEntity` created it a few lines earlier and
        // stamped the sender as its creator. No existing state is reachable that way,
        // but it does let a peer make the server broadcast a create and a delete for
        // a phantom entity. Upgrade path: skip the create for DELETE_ENTITY_NETWORK
        // and reject the message when the lookup misses.
        return sender === AUTH_SERVER_PEER_ID || CreatedBy.getOrNull(localEntityId)?.address === sender

      default:
        console.error(
          `[network] rejected an unhandled message type ${
            CrdtMessageType[message.type] ?? message.type
          } from ${sender}: the authoritative server only accepts component writes and entity deletions`
        )
        return false
    }
  }

  function broadcastBatchedMessages(messages: codec.NetworkMessage[], excludeSender: string) {
    if (messages.length === 0) return

    // The messages still carry the bytes they arrived as, so re-broadcasting them
    // is a matter of packing those slices — no re-serialization, no second parse.
    const chunks = codec.packChunks(messages)

    for (const chunk of chunks) {
      binaryMessageBus.emit(CommsMessage.CRDT, chunk)
    }
    DEBUG_NETWORK_MESSAGES() &&
      console.log(`Total: ${messages.length} messages in ${chunks.length} chunks from ${excludeSender}`)
  }

  function sendCorrectionToSender(networkMessage: codec.NetworkMessage, sender: string, localEntityId: Entity) {
    try {
      if (networkMessage.type === CrdtMessageType.DELETE_ENTITY_NETWORK) {
        DEBUG_NETWORK_MESSAGES() && console.log('[AUTHORITATIVE] Cannot send authoritative message for entity deletion')
        return
      }

      // narrowed away DELETE_ENTITY_NETWORK above, so componentId/timestamp exist
      const component = engine.getComponent(networkMessage.componentId)

      if (!supportsCorrections(component)) {
        DEBUG_NETWORK_MESSAGES() && console.log('[AUTHORITATIVE] Component does not support authoritative messages')
        return
      }

      const serverCRDTState = component.getCrdtState(localEntityId)
      const correctionBuffer = new ReadWriteByteBuffer()

      if (serverCRDTState) {
        // each client turns this into an AUTHORITATIVE_PUT_COMPONENT for its own entity id
        PutNetworkComponentOperation.write(
          networkMessage.entityId, // Use original network entity ID
          serverCRDTState.timestamp,
          networkMessage.componentId,
          networkMessage.networkId,
          serverCRDTState.data,
          correctionBuffer
        )
      } else {
        // A rejected *first* write leaves the server holding nothing, and "revert to
        // the server state" then means "you do not have this component". There is no
        // authoritative delete on the wire — AUTHORITATIVE_PUT_COMPONENT is the only
        // force-applied opcode — so the delete has to win the LWW on merit, and the
        // one clock we know beats the offender's is the timestamp it just sent.
        DeleteComponentNetwork.write(
          networkMessage.entityId,
          networkMessage.componentId,
          networkMessage.timestamp + 1,
          networkMessage.networkId,
          correctionBuffer
        )
      }

      binaryMessageBus.emit(CommsMessage.CRDT_AUTHORITATIVE, correctionBuffer.toBinary(), [sender])

      DEBUG_NETWORK_MESSAGES() &&
        console.log(
          `[AUTHORITATIVE] Sent authoritative ${
            serverCRDTState ? 'state' : 'delete'
          } to ${sender} for entity ${localEntityId} component ${networkMessage.componentId} with timestamp ${
            networkMessage.timestamp
          }`
        )
    } catch (error) {
      DEBUG_NETWORK_MESSAGES() && console.error('Error sending correction:', error)
    }
  }

  return {
    // transform Network messages to CRDT Common Messages.
    // `seen` collects the local entities the payload named, so a caller applying a
    // full state dump can tell which of its network entities the dump left out
    // without parsing the payload a second time.
    processClientMessages: function processClientMessages(
      value: Uint8Array,
      sender: string,
      forceCorrections = false,
      seen?: Set<Entity>
    ) {
      const combinedBuffer = new ReadWriteByteBuffer()

      for (const message of codec.readMessages(value)) {
        if (codec.isNetworkMessage(message)) {
          const networkMessage = message as codec.NetworkMessage

          const localEntityId = findOrCreateNetworkEntity(networkMessage, sender, false)
          seen?.add(localEntityId)

          // Nothing validates a message from the authoritative server, so it is
          // translated straight into the buffer the engine will be handed
          convertNetworkToRegularMessage(networkMessage, localEntityId, combinedBuffer, forceCorrections)
        }
      }
      return combinedBuffer.toBinary()
    },
    // Server code: process message, handle permissions, and broadcast if needed.
    processServerMessages: function processServerMessages(value: Uint8Array, sender: string) {
      const messagesToBroadcast: codec.NetworkMessage[] = []
      const regularMessagesBuffer = new ReadWriteByteBuffer()
      // a message is translated before it is judged, so it lands here first and is
      // only copied into the batch once it has been accepted
      const candidate = new ReadWriteByteBuffer()

      for (const message of codec.readMessages(value)) {
        try {
          if (codec.isNetworkMessage(message)) {
            const networkMessage = message as codec.NetworkMessage
            const localEntityId = findOrCreateNetworkEntity(networkMessage, sender, true)

            candidate.resetBuffer()
            const regularMessage = convertNetworkToRegularMessage(networkMessage, localEntityId, candidate)

            // A payload that did not decode is unvalidatable and therefore
            // unbroadcastable, so it is treated as a rejection rather than waved
            // through as an untyped message.
            if (!regularMessage || !validateMessagePermissions(regularMessage, sender, localEntityId)) {
              sendCorrectionToSender(networkMessage, sender, localEntityId)
              continue
            }

            messagesToBroadcast.push(networkMessage)

            if (candidate.currentWriteOffset()) {
              regularMessagesBuffer.writeBuffer(candidate.toBinary(), false)
            }
          }
        } catch (error) {
          console.error('Error processing server message:', error)
        }
      }
      broadcastBatchedMessages(messagesToBroadcast, sender)
      return regularMessagesBuffer.toBinary()
    },
    // engine changes that needs to be broadcasted.
    convertRegularToNetworkMessage: function convertRegularToNetworkMessage(regularMessage: Uint8Array): Uint8Array[] {
      // One scratch buffer for the batch: the packer copies each message out before
      // pulling the next one, which overwrites it.
      function* asNetworkMessages(): Generator<codec.PackableMessage> {
        const scratch = new ReadWriteByteBuffer()
        for (const message of codec.readMessages(regularMessage)) {
          const networkData = NetworkEntity.getOrNull(message.entityId)
          if (!networkData || codec.isNetworkMessage(message)) continue

          scratch.resetBuffer()
          codec.localMessageToNetwork(message, networkData, scratch)
          // AUTHORITATIVE_PUT_COMPONENT has no network counterpart and encodes to nothing
          if (!scratch.currentWriteOffset()) continue

          yield {
            messageBuffer: scratch.toBinary(),
            entityId: message.entityId,
            componentId: 'componentId' in message ? message.componentId : undefined
          }
        }
      }

      return codec.packChunks(asNetworkMessages())
    }
  }
}
