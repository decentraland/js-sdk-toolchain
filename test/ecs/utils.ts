import { Quaternion, Vector3 } from '../../packages/@dcl/sdk/math'
import { Engine, IEngine } from '../../packages/@dcl/ecs/src/engine'
import { Entity } from '../../packages/@dcl/ecs/src/engine/entity'
import { componentNumberFromName } from '../../packages/@dcl/ecs/src/components/component-number'
import { TransportMessage, Transport, CrdtMessageHeader } from '../../packages/@dcl/ecs/src'
import { CrdtMessageProtocol, CrdtMessageType } from './../../packages/@dcl/ecs/src/serialization/crdt'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { components, Schemas, EntityUtils, EntityState } from '../../packages/@dcl/ecs/src'
import { compareData, compareStatePayloads } from '../crdt/utils'

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

/**
 * Compare the internal crdt state with the engine state.
 * - Deleted entities in the engine have to be the same as in the deleted entities gset on crdt
 * - each pair of <component, entityId> has to be the same data in both
 *
 * @param engine
 * @returns object with a conflicts array, if it's zero, it goes well.
 */
export function checkCrdtStateWithEngine(engine: IEngine) {
  const conflicts: string[] = []
  const usedEntitiesByComponents: Set<Entity> = new Set()
  const crdtState = engine.getCrdtState()

  for (const def of engine.componentsIter()) {
    const componentValues = Array.from(def.iterator())
    const crdtComponent = crdtState.components.get(def.componentId)

    if (componentValues.length === 0 && (crdtComponent === undefined || crdtComponent.size === 0)) {
      continue
    }

    if (crdtComponent === undefined) {
      conflicts.push(
        `Component ${def.componentId} has ${componentValues.length} entities but there is no state stored in the CRDT.`
      )
    }

    for (const [entity, _value] of componentValues) {
      usedEntitiesByComponents.add(entity)
      if (crdtComponent === undefined) {
        continue
      }

      const crdtEntry = crdtComponent.get(entity)
      const data = def.toBinary(entity).toBinary()

      if (crdtEntry === null || crdtEntry === undefined || crdtEntry.data === null) {
        conflicts.push(
          `Entity ${entity} with componentId ${def.componentId} has value in the engine but not in the crdt.`
        )
        continue
      }

      const theSame = compareData(crdtEntry.data, data)
      if (!theSame) {
        conflicts.push(
          `Entity ${entity} with componentId ${
            def.componentId
          } hasn't equal values between CRDT and engine => ${crdtEntry.data.toString()} vs ${data.toString()}`
        )
      }
    }

    if (crdtComponent !== undefined) {
      // If CRDT has more entities, this will show the conflicts
      for (const [entity, _payload] of crdtComponent) {
        if (def.getOrNull(entity as Entity) === null) {
          conflicts.push(
            `Entity ${entity} with componentId ${def.componentId} has value in the CRDT but not in the engine.`
          )
        }
      }
    }
  }

  for (const [entityNumber, entityVersion] of engine.getCrdtState().deletedEntities.getMap()) {
    const entity = EntityUtils.toEntityId(entityNumber, entityVersion)

    if (engine.getEntityState(entity) !== EntityState.Removed) {
      conflicts.push(
        `Entity ${entity} is added to deleted entities in the CRDT state, but the state in the engine isn't.`
      )
    }
  }

  for (const entityId of usedEntitiesByComponents) {
    const [n, v] = EntityUtils.fromEntityId(entityId)
    if (crdtState.deletedEntities.has(n, v)) {
      conflicts.push(
        `Entity ${entityId} is added to deleted entities in the CRDT state, but the entity is being used in the engine.`
      )
    }
  }

  return {
    conflicts
  }
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
      const clientTransport = createNetworkTransport()
      const operations: {
        entity: Entity
        operation: CrdtMessageType
        value: unknown
      }[] = []
      const engine = Engine({
        onChangeFunction: (entity, operation, component) => {
          operations.push({
            entity,
            operation,
            value: component ? component.getOrNull(entity) : null
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
      const Material = components.Material(engine)

      return {
        id: index,
        engine,
        transports: [clientTransport],
        flushOutgoing,
        shuffleOutgoingMessages,
        Transform,
        MeshRenderer,
        Material,
        operations
      }
    })

    function getCrdtStates() {
      return clients.map((client) => client.engine.getCrdtState())
    }
    async function testCrdtSynchronization() {
      for (const client of clients) {
        await client.engine.update(1)
      }

      for (const client of clients) {
        client.flushOutgoing()
      }

      for (const client of clients) {
        await client.engine.update(1)
      }

      const crdtStateConverged = compareStatePayloads(getCrdtStates())
      const clientsEngineState = clients.map((client) => ({
        id: client.id,
        res: checkCrdtStateWithEngine(client.engine)
      }))
      const allConflicts = clientsEngineState.map((item) => item.res.conflicts).flat(1)

      return {
        crdtStateConverged,
        clientsEngineState,
        allConflicts
      }
    }

    return {
      clients,
      testCrdtSynchronization,
      getCrdtStates
    }
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
        onChangeFunction: (entity, _operation, component) => {
          operations.push({
            entity,
            value: component ? component.getOrNull(entity) : null
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
