import { Quaternion, Vector3 } from '../../packages/@dcl/ecs/src/runtime/math'
import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { Schemas } from '../../packages/@dcl/ecs/src/schemas'
import * as transport from '../../packages/@dcl/ecs/src/systems/crdt/transports/networkTransport'

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

export function setupDclInterfaceForThisSuite(
  modules: Record<string, Record<string, (arg: any) => Promise<any>>> = {},
  defaults: Partial<DecentralandInterface> = {}
) {
  const updateFns: Array<(dt: number) => void> = []
  const eventFns: Array<(any: any) => void> = []
  const startFns: Array<() => void> = []
  const subscribeEvents: Set<string> = new Set()

  const dcl: DecentralandInterface = {
    // legacy not used
    addEntity: () => {
      throw new Error('not implemented')
    },
    attachEntityComponent: () => {
      throw new Error('not implemented')
    },
    componentCreated: () => {
      throw new Error('not implemented')
    },
    componentDisposed: () => {
      throw new Error('not implemented')
    },
    componentUpdated: () => {
      throw new Error('not implemented')
    },
    openExternalUrl: () => {
      throw new Error('not implemented')
    },
    removeEntity: () => {
      throw new Error('not implemented')
    },
    removeEntityComponent: () => {
      throw new Error('not implemented')
    },
    query: () => {
      throw new Error('not implemented')
    },
    openNFTDialog: () => {
      throw new Error('not implemented')
    },
    subscribe: (event: string) => {
      subscribeEvents.add(event)
    },
    unsubscribe: (event: string) => {
      subscribeEvents.delete(event)
    },
    setParent: () => {
      throw new Error('not implemented')
    },
    updateEntityComponent: () => {
      throw new Error('not implemented')
    },
    updateEntity: (() => {
      throw new Error('not implemented')
    }) as any,
    DEBUG: true,
    // utils
    error: console.error,
    log: console.log,
    onEvent: (fn) => eventFns.push(fn),
    onUpdate: (fn) => updateFns.push(fn),
    onStart: (fn) => startFns.push(fn as any),
    // modules
    async callRpc(moduleName, method, args) {
      if (!modules[moduleName])
        throw new Error(`Module ${moduleName} not found`)
      if (!modules[moduleName][method])
        throw new Error(`Method ${moduleName}.${method} not found`)
      return modules[moduleName][method].apply(null, args as any)
    },
    async loadModule(moduleName, exportsObj) {
      if (!modules[moduleName])
        throw new Error(`Module ${moduleName} not found`)
      const ret: ModuleDescriptor = {
        rpcHandle: moduleName,
        methods: []
      }
      for (const methodName in modules[moduleName]) {
        exportsObj[methodName] = modules[moduleName][methodName].bind(
          modules[moduleName]
        )
        ret.methods.push({ name: methodName })
      }
      return ret
    },
    ...defaults
  }

  beforeAll(() => {
    updateFns.length = 0
    eventFns.length = 0
    startFns.length = 0
    globalThis.dcl = dcl
  })

  function tick(dt: number) {
    updateFns.forEach(($) => $(dt))
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
      const engine = Engine({ transports: [clientTransport] })
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
