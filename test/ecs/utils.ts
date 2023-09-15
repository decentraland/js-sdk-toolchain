import { Quaternion, Vector3 } from '../../packages/@dcl/sdk/math'
import { Engine } from '../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { componentNumberFromName } from '../../packages/@dcl/ecs/src/components/component-number'
import { Transport, CrdtMessageHeader } from '../../packages/@dcl/ecs/src'
import { CrdtMessageProtocol, CrdtMessageType } from './../../packages/@dcl/ecs/src/serialization/crdt'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { components, Schemas } from '../../packages/@dcl/ecs/src'

export function createNetworkManager(): Transport {
  async function send(..._args: any[]) {}

  return {
    send,
    filter(): boolean {
      return true
    }
  }
}

export function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(() => resolve(), ms))
}

export namespace SandBox {
  export const WS_SEND_DELAY = 30
  export const Position = {
    id: componentNumberFromName('88'),
    name: '88',
    type: { x: Schemas.Float, y: Schemas.Float }
  }
  export const Door = {
    id: componentNumberFromName('888'),
    name: '888',
    type: { open: Schemas.Byte }
  }

  export const DEFAULT_POSITION = {
    position: Vector3.create(0, 1, 2),
    scale: Vector3.One(),
    rotation: Quaternion.Identity(),
    parent: 0 as Entity
  }

  export function createEngines({ length }: { length: number }) {
    const clients = Array.from({ length }).map((_, index) => {
      const clientTransport = createNetworkManager()
      const operations: {
        entity: Entity
        operation: CrdtMessageType
        value: unknown
      }[] = []
      const engine = Engine({
        onChangeFunction: (entity, operation, component, value) => {
          operations.push({
            entity,
            operation,
            value
          })
        }
      })

      type Message = CrdtMessageHeader & { data: Uint8Array }
      let msgsOutgoing: Message[] = []
      clientTransport.send = async (message: Uint8Array) => {
        const buffer = new ReadWriteByteBuffer(message)

        let header: CrdtMessageHeader | null
        while ((header = CrdtMessageProtocol.getHeader(buffer))) {
          const offset = buffer.incrementReadOffset(header.length)
          const data = new Uint8Array(message.subarray(offset, offset + header.length))
          msgsOutgoing.push({
            ...header,
            data
          })
        }
      }

      function flushOutgoing(length: number = 0) {
        const N: number = Math.min(length || msgsOutgoing.length, msgsOutgoing.length)
        if (N === 0) return

        const buffer = new ReadWriteByteBuffer()
        for (let i = 0; i < N; i++) {
          const msg = msgsOutgoing.pop()!
          buffer.writeBuffer(msg.data, false)
        }

        for (const client of clients) {
          if (client.id !== index) {
            if (client.transports[0].onmessage) {
              client.transports[0].onmessage(new Uint8Array(buffer.toBinary()))
            }
          }
        }
      }

      function shuffleOutgoingMessages(seed: number) {
        const rand = getRandomFunction(seed)
        msgsOutgoing = msgsOutgoing
          .map((value) => ({ value, index: rand() }))
          .sort((a, b) => a.index - b.index)
          .map((item) => item.value)
      }

      engine.addTransport(clientTransport)

      const Transform = components.Transform(engine)
      const MeshRenderer = components.MeshRenderer(engine)
      const PointerEventsResult = components.PointerEventsResult(engine)
      const Material = components.Material(engine)

      return {
        id: index,
        engine,
        transports: [clientTransport],
        flushOutgoing,
        shuffleOutgoingMessages,
        Transform,
        MeshRenderer,
        PointerEventsResult,
        Material,
        operations
      }
    })

    async function flushCrdtAndSynchronize() {
      for (const client of clients) {
        await client.engine.update(1)
      }

      for (const client of clients) {
        client.flushOutgoing()
      }

      for (const client of clients) {
        await client.engine.update(1)
      }
    }

    return {
      clients,
      flushCrdtAndSynchronize
    }
  }

  /**
   * Mock websocket transport so we can fake communication
   * between two engines. WebSocket A <-> WebSocket B
   */
  export function create({ length }: { length: number }) {
    const clients = Array.from({ length }).map((_, index) => {
      const clientTransport = createNetworkManager()
      const operations: {
        entity: Entity
        value: unknown
      }[] = []
      const engine = Engine({
        onChangeFunction: (entity, operation, component, value) => {
          operations.push({
            entity,
            value
          })
        }
      })
      engine.addTransport(clientTransport)
      const Position = engine.defineComponent(SandBox.Position.name, SandBox.Position.type)
      const Door = engine.defineComponent(SandBox.Door.name, SandBox.Door.type)

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
      for (let transportIndex = 0; transportIndex < client.transports.length; transportIndex++) {
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

/**
 * Return a pseudo-random number generator that returns between 0 inclusive and 1 exclusive.
 * The algorithm used is MWC (multiply-with-carry) by George Marsaglia.
 */
export function getRandomFunction(_seed?: number) {
  const state = {
    mz: 123456789,
    mw: _seed || new Date().getTime()
  }
  return function random() {
    let mz = state.mz
    let mw = state.mw
    mz = ((mz & 0xffff) * 36969 + (mz >> 16)) & 0xffffffff
    mw = ((mw & 0xffff) * 18000 + (mw >> 16)) & 0xffffffff
    state.mz = mz
    state.mw = mw
    const x = (((mz << 16) + mw) & 0xffffffff) / 0x100000000
    return 0.5 + x
  }
}
