import { Quaternion, Vector3 } from '@dcl/ecs-math'

import { Float32, Int8, MapType } from '../src/built-in-types'
import { Transform } from '../src/components/legacy/Transform'
import { Engine } from '../src/engine'
import { Entity } from '../src/engine/entity'
import * as transport from '../src/systems/crdt/transports/networkTransport'

export function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), ms))
}

export namespace SandBox {
  export const WS_SEND_DELAY = 30
  export const Position = { id: 88, type: MapType({ x: Float32, y: Float32 }) }
  export const Door = { id: 888, type: MapType({ open: Int8 }) }

  export const DEFAULT_POSITION: ReturnType<typeof Transform['deserialize']> = {
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
      const clientTransport = transport.createNetworkTransport()
      const engine = Engine({ transports: [clientTransport] })
      const Position = engine.defineComponent(
        SandBox.Position.id,
        SandBox.Position.type
      )
      const Door = engine.defineComponent(SandBox.Door.id, SandBox.Door.type)

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
        transport.send = (data) => {
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
