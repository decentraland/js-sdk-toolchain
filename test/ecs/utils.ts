import { Quaternion, Vector3 } from '../../packages/@dcl/sdk/math'
import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import { TransportMessage, Transport } from '../../packages/@dcl/ecs/src'

export function createNetworkTransport(): Transport {
  async function send(..._args: any[]) {}

  return {
    send,
    filter(message: TransportMessage): boolean {
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
      const operations: {
        entity: Entity
        value: unknown
      }[] = []
      const engine = Engine({
        onChangeFunction: (entity, component, _operation) => {
          operations.push({ entity, value: component.getOrNull(entity) })
        }
      })
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
        spySend: jest.spyOn(clientTransport, 'send'),
        clientTransport,
        operations
      }
    })

    for (const client of clients) {
      for (
        let transportIndex = 0;
        transportIndex < client.transports.length;
        transportIndex++
      ) {
        const transport = client.transports[transportIndex]
        transport.send = async (data: Uint8Array) => {
          for (const c of clients) {
            if (c.id !== client.id && c.clientTransport !== transport) {
              await wait(WS_SEND_DELAY)
              c.clientTransport.onmessage!(data)
            }
          }
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
