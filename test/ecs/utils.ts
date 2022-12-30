import { Quaternion, Vector3 } from '../../packages/@dcl/sdk/math'
import { Engine, IEngine } from '../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { TransportMessage, Transport, WireMessage, WireMessageHeader } from '../../packages/@dcl/ecs/src'
import { createByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { components, Schemas, EntityUtils, EntityState } from '../../packages/@dcl/ecs/src'
import { compareData } from '../crdt/utils'

export function createNetworkTransport(): Transport {
  async function send(..._args: any[]) { }

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


export function checkCrdtStateWithEngine(engine: IEngine) {
  const conflicts: string[] = []
  const usedEntitiesByComponents: Set<Entity> = new Set()
  const crdtState = engine.getCrdtState()

  for (const [componentId, def] of engine.componentsDefinition) {
    const componentValues = Array.from(def.iterator())
    const crdtComponent = crdtState.components.get(componentId)

    if (componentValues.length === 0 && (crdtComponent === undefined || crdtComponent.size === 0)) {
      continue
    }

    if (crdtComponent === undefined) {
      conflicts.push(`Component ${componentId} has ${componentValues.length
        } entities but there is no state stored in the CRDT.`)
    }

    for (const [entity, value] of componentValues) {
      usedEntitiesByComponents.add(entity)
      if (crdtComponent === undefined) {
        continue
      }

      const crdtEntry = crdtComponent.get(entity)
      const data = def.toBinary(entity).toBinary()

      if (crdtEntry === null || crdtEntry === undefined || crdtEntry.data === null) {
        conflicts.push(`Entity ${entity} with componentId ${componentId} has value in the engine but not in the crdt.`)
        continue
      }

      const theSame = compareData(crdtEntry.data, data)
      if (!theSame) {
        conflicts.push(`Entity ${entity} with componentId ${componentId} hasn't equal values between CRDT and engine => ${crdtEntry.data.toString()} vs ${data.toString()}`)
      }
    }

    if (crdtComponent !== undefined) {
      // If CRDT has more entities, this will show the conflicts
      for (const [entity, payload] of crdtComponent) {
        if (def.getOrNull(entity as Entity) === null) {
          conflicts.push(`Entity ${entity} with componentId ${componentId} has value in the CRDT but not in the engine.`)
        }
      }
    }
  }


  for (const [entityNumber, entityVersion] of engine.getCrdtState().deletedEntities.getMap()) {
    const entity = EntityUtils.toEntityId(entityNumber, entityVersion)

    if (engine.getEntityState(entity) !== EntityState.Removed) {
      conflicts.push(`Entity ${entity} is added to deleted entities in the CRDT state, but the state in the engine isn't.`)
    }
  }

  for (const entityId of usedEntitiesByComponents) {
    const [n, v] = EntityUtils.fromEntityId(entityId)
    if (crdtState.deletedEntities.has(n, v)) {
      conflicts.push(`Entity ${entityId} is added to deleted entities in the CRDT state, but the entity is being used in the engine.`)
    }
  }

  return {
    conflicts,
    freeConflicts: conflicts.length === 0
  }

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

  export function createEngines({ length }: { length: number }) {
    const clients = Array.from({ length }).map((_, index) => {
      const clientTransport = createNetworkTransport()
      const engine = Engine()

      type Message = WireMessageHeader & { data: Uint8Array }
      let msgsOutgoing: Message[] = []
      clientTransport.send = async (message: Uint8Array) => {
        const buffer = createByteBuffer({
          reading: { buffer: message, currentOffset: 0 }
        })

        let header: WireMessageHeader | null
        while ((header = WireMessage.getHeader(buffer))) {
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

        const buffer = createByteBuffer()
        for (let i = 0; i < N; i++) {
          const msg = msgsOutgoing.pop()!
          const offset = buffer.incrementWriteOffset(msg.length)
          buffer.buffer().set(msg.data, offset)
        }

        for (const client of clients) {
          if (client.id !== index) {
            if (client.transports[0].onmessage) {
              client.transports[0].onmessage(
                new Uint8Array(buffer.toBinary())
              )
            }
          }
        }
      }

      function shuffleOutgoingMessages() {
        msgsOutgoing = msgsOutgoing.map((value) => ({ value, index: Math.random() })).sort((a, b) => a.index - b.index).map(item => item.value)
      }


      engine.addTransport(clientTransport)

      const Transform = components.Transform(engine)
      const MeshRenderer = components.MeshRenderer(engine)
      const Material = components.Material(engine)

      return {
        id: index,
        engine,
        transports: [clientTransport],
        flushOutgoing,
        shuffleOutgoingMessages,
        Transform,
        MeshRenderer,
        Material
      }
    })

    return {
      clients,
      getCrdtStates() {
        return clients.map(client => client.engine.getCrdtState())
      }
    }
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
        spySend: jest.spyOn(clientTransport, 'send'),
        clientTransport
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
