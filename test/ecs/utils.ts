import { Quaternion, Vector3 } from '../../packages/@dcl/sdk/math'
import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { TransportMessage, Transport } from '../../packages/@dcl/ecs/src'

export function createNetworkTransport(): Transport {
  // const rpc = new RpcTransport()
  async function send(..._args: any[]) {
    // console.log('NetworkMessage Sent: ', ...args)
  }

  const type = 'network-transport'
  return {
    resendOutdatedMessages: false,
    send,
    type,
    filter(message: TransportMessage): boolean {
      // Echo message, ignore them
      if (message.transportType === type) {
        return false
      }

      return !!message
    }
  }
}

export function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), ms))
}

export namespace SandBox {
  export const WS_SEND_DELAY = 30
  export const Position = {
    id: 88,
    type: { x: Schemas.Float, y: Schemas.Float }
  }
  export const Door = { id: 888, type: { open: Schemas.Byte } }

  export const DEFAULT_POSITION = {
    position: Vector3.create(0, 1, 2),
    scale: Vector3.One(),
    rotation: Quaternion.Identity(),
    parent: 0 as Entity
  }

  /**
   * Mock websocket transport so we can fake communication
   * between two engines. WebSocket A <-> WebSocket B
   */
  export function create({ length }: { length: number }) {
    const clients = Array.from({ length }).map((_, index) => {
      const clientTransport = createNetworkTransport()
      const engine = Engine()
      engine.addTransport(clientTransport)
      const Position = engine.defineComponent(
        SandBox.Position.type,
        SandBox.Position.id
      )
      const Door = engine.defineComponent(SandBox.Door.type, SandBox.Door.id)

      return {
        id: index,
        engine,
        transports: [clientTransport],
        components: { Door, Position },
        spySend: jest.spyOn(clientTransport, 'send')
      }
    })

    for (const client of clients) {
      for (const transport of client.transports) {
        transport.send = async (data: Uint8Array) => {
          clients
            .filter((c) => c.id !== client.id)
            .map((c) => c.transports.find((t) => t.type === transport.type))
            .forEach(async (clientTransport) => {
              await wait(WS_SEND_DELAY)
              clientTransport?.onmessage!(data)
            })
        }
      }
    }

    return clients.map((c) => ({
      ...c,
      spySend: jest.spyOn(c.transports[0], 'send')
    }))
  }
}

export function isNotUndefined<T>(val: T | undefined): val is T {
  return !!val
}
