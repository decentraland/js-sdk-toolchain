import { Message, crdtProtocol, MessageType } from '../../../packages/@dcl/crdt/src'
import { compareStatePayloads, sleep } from '.'
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
export function createSandbox<T extends Buffer | Uint8Array | string = Buffer>(
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
    async function send(message: Message<T>) {
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
      entityVersion: function (entity: number) {
        return (((entity & 4294901760) >> 16) & 65535) >>> 0
      },
      entityNumber: function (entity: number) {
        return (entity & 65535) >>> 0
      },
      entityId: function (entityNumber: number, entityVersion: number): number {
        return ((entityNumber & 65535) | ((entityVersion & 65535) << 16)) >>> 0
      }
    })

    return {
      ...crdt,
      id: uuid,
      sendMessage: function (message: Message<T>) {
        snapshot.addMessage(message)
        return ws.send(message)
      },
      onMessage: function (message: Message<T>) {
        const msg = crdt.processMessage(message)

        // If the returned process message its different,
        // it means its an outdated message. Broadcast it.
        if ((msg.type === MessageType.MT_LWW && message.type === MessageType.MT_LWW && msg.data !== message.data) ||
          (msg.type === MessageType.MT_AddGSet && message.entityId !== msg.entityId)) {
          return ws.send(msg)
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
