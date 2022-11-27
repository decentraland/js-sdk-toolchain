import { Quaternion, Vector3 } from '../../packages/@dcl/ecs/src'
import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import * as transport from '../../packages/@dcl/sdk/src/transports/networkTransport'

export function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), ms))
}

export function testingEngineApi() {
  const sentMessages: Uint8Array[] = []
  const messagesFromRenderer: Uint8Array[] = []
  const modules = {
    '~system/EngineApi': {
      async crdtSendToRenderer(arg: { data: Uint8Array }) {
        sentMessages.push(arg.data)
      },
      async crdtGetMessageFromRenderer() {
        const ret = messagesFromRenderer.slice(0)
        messagesFromRenderer.length = 0
        return ret
      }
    }
  }
  return { modules, sentMessages, messagesFromRenderer }
}

require.extensions

export function setupDclInterfaceForThisSuite(
  modules: Record<string, Record<string, (arg: any) => Promise<any>>> = {}
) {
  const updateFns: Array<(dt: number) => Promise<void>> = []
  const eventFns: Array<(any: any) => void> = []
  const startFns: Array<() => void> = []
  const subscribeEvents: Set<string> = new Set()

  beforeAll(() => {
    updateFns.length = 0
    eventFns.length = 0
    startFns.length = 0
    globalThis.require = function (moduleName: string) {
      if (moduleName in modules) return modules[moduleName]
      throw new Error(`Module ${moduleName} not found`)
    } as any
  })

  async function tick(dt: number) {
    for (const fn of updateFns) {
      await fn(dt)
    }
  }

  return { eventFns, updateFns, startFns, tick, subscribeEvents }
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
      const clientTransport = transport.createNetworkTransport()
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

export function isNotUndefined<T>(val: T | undefined): val is T {
  return !!val
}
