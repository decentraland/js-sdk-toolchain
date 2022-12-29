import { compareStatePayloads, sleep } from '.'
import {
  CRDTMessage,
  CRDTMessageType,
  crdtProtocol,
  ProcessMessageResultType
} from '../../../packages/@dcl/crdt/src'
import { snapshotTest } from './snapshot'

/**
 * Sandbox type opts
 * @internal
 */
type Sandbox = {
  clientLength: number
  delay?: boolean
}

/**
 * Generate clients, transport and compare fns so its easier to write tests.
 * @internal
 */
export function createSandbox<T extends Buffer | Uint8Array | string | number = Buffer>(
  opts: Sandbox
) {
  /**
   *
   */
  const snapshot = snapshotTest()

  /**
   * Transport method to broadcast the messages.
   * @internal
   */
  function broadcast(uuid: string) {
    async function send(message: CRDTMessage<T>) {
      const randomTime = (Math.random() * 100 + 50) | 0
      if (opts.delay) {
        await sleep(randomTime)
      }
      await Promise.all(
        clients.map((c) => c.id !== uuid && c.onMessage(message))
      )
    }

    return {
      send
    }
  }

  /**
   * Generate all the clients
   */
  const clients = Array.from({ length: opts.clientLength }).map((_, index) => {
    const uuid = `${index}`
    const ws = broadcast(uuid)
    const crdt = crdtProtocol<T>({
      fromEntityId: function (entity: number) {
        return [
          (entity & 65535) >>> 0,
          (((entity & 4294901760) >> 16) & 65535) >>> 0
        ]
      },
      toEntityId: function (
        entityNumber: number,
        entityVersion: number
      ): number {
        return ((entityNumber & 65535) | ((entityVersion & 65535) << 16)) >>> 0
      }
    })

    return {
      ...crdt,
      id: uuid,
      sendMessage: function (message: CRDTMessage<T>) {
        snapshot.addMessage(message)
        return ws.send(message)
      },
      onMessage: function (message: CRDTMessage<T>) {
        const msg = crdt.processMessage(message)

        // If the returned process message its different,
        // it means its an outdated message. Broadcast it.
        // TODO: what about delete entity message
        if (
          (msg === ProcessMessageResultType.StateOutdatedData ||
            msg === ProcessMessageResultType.StateOutdatedTimestamp) &&
          message.type === CRDTMessageType.CRDTMT_PutComponentData
        ) {
          const current = crdt
            .getState()
            .components.get(message.componentId)!
            .get(message.entityId)!
          const newMsg: CRDTMessage<T> = {
            type: CRDTMessageType.CRDTMT_PutComponentData,
            data: current.data,
            timestamp: current.timestamp,
            componentId: message.componentId,
            entityId: message.entityId
          }
          return ws.send(newMsg)
        }
      }
    }
  })

  /**
   *  Expose fn to compare every client state with each other.
   *  And also, saves the state in the test file.
   */
  async function compare() {
    expect(compareStatePayloads(clients.map((c) => c.getState()))).toBe(true)
    await snapshot.validateSpec(clients[0].getState())
  }

  return {
    compare,
    clients
  }
}
