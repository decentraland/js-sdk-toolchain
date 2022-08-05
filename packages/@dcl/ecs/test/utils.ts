import { Quaternion, Vector3 } from '@dcl/ecs-math'

import { Schemas } from '../src/schemas'
import { Transform } from '../src/components/legacy/Transform'
import { Engine } from '../src/engine'
import { Entity } from '../src/engine/entity'
import * as transport from '../src/systems/crdt/transports/networkTransport'
import { ensureComponentsFromEngine } from './components/utils'

export function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), ms))
}

export namespace SandBox {
  export const WS_SEND_DELAY = 30
  export const Position = {
    id: 88,
    type: Schemas.Map({ x: Schemas.Float, y: Schemas.Float })
  }
  export const Door = { id: 888, type: Schemas.Map({ open: Schemas.Byte }) }

  export const DEFAULT_POSITION: Transform = {
    position: Vector3.create(0, 1, 2),
    scale: Vector3.One(),
    rotation: Quaternion.Identity(),
    parent: 0 as Entity
  }

  /**
   * Mock websocket transport so we can fake communication
   * between two engines. WebSocket A <-> WebSocket B
   */
  export async function create({ length }: { length: number }) {
    async function createClient(id: number) {
      const clientTransport = transport.createNetworkTransport()
      const engine = Engine({ transports: [clientTransport] })
      const sdk = await ensureComponentsFromEngine(engine)
      const Position = engine.defineComponent(
        SandBox.Position.id,
        SandBox.Position.type
      )
      const Door = engine.defineComponent(SandBox.Door.id, SandBox.Door.type)

      return {
        id,
        engine,
        transports: [clientTransport],
        components: { Door, Position },
        spySend: jest.spyOn(clientTransport, 'send'),
        sdk
      }
    }

    const clientPromises = Array.from({ length }).map(async (_, index) =>
      createClient(index)
    )
    const clients = await Promise.all(clientPromises)

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
