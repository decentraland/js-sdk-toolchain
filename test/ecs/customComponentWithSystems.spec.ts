import {
  CrdtMessageType,
  Engine,
  Entity,
  EntityState,
  IEngine,
  CrdtMessage,
  Transport
} from '../../packages/@dcl/ecs/src'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { readMessage } from '../../packages/@dcl/ecs/src/serialization/crdt/message'
import { ID, int8Component } from './int8component'

function connectEngines(a: IEngine, b: IEngine) {
  const connection: {
    interceptedMessages: any[]
  } = {
    interceptedMessages: []
  }

  function intercept(data: Uint8Array, direction: string) {
    const buffer = new ReadWriteByteBuffer(data)

    let msg: CrdtMessage | null
    while ((msg = readMessage(buffer))) {
      connection.interceptedMessages.push({
        ...msg,
        direction
      })
    }
  }

  const transportA: Transport = {
    async send(data) {
      intercept(data, 'a->b')
      transportB.onmessage!(data)
    },
    filter() {
      return true
    },
    onmessage: () => {
      throw new Error('transportA onmessage not implemented')
    }
  }
  const transportB: Transport = {
    async send(data) {
      intercept(data, 'b->a')
      transportA.onmessage!(data)
    },
    filter() {
      return true
    },
    onmessage: () => {
      throw new Error('transportB onmessage not implemented')
    }
  }

  a.addTransport(transportA)
  b.addTransport(transportB)

  return { connection }
}

describe('test CRDT flow E2E', () => {
  const engineA = Engine()
  const engineB = Engine()
  const env = connectEngines(engineA, engineB)
  function removeEntityB(entity: Entity) {
    removeEntity(engineB, entity)
  }
  function removeEntity(engine: IEngine, entity: Entity) {
    const name = 'systemEntity'
    function update() {
      engine.removeEntity(entity)
      engine.removeSystem(name)
    }
    engine.addSystem(update, 0, name)
  }

  function updateIntA(entity: Entity, value: number) {
    updateInt(engineA, entity, value)
  }
  function updateIntB(entity: Entity, value: number) {
    updateInt(engineB, entity, value)
  }
  function updateInt(engine: IEngine, entity: Entity, value: number) {
    const name = 'system'
    function update() {
      const component = engine.getComponent(ID)!
      component.createOrReplace(entity, value)
      engine.removeSystem(name)
    }
    engine.addSystem(update, 0, name)
  }

  it('in empty engines there should be no messages', async () => {
    // in empty engines there should be no messages
    await engineA.update(0)
    await engineB.update(0)
    expect(env.connection.interceptedMessages).toEqual([])
  })

  // then create an entity in engineA
  const entityA = engineA.addEntity()

  it('adding an entity should emit no message', async () => {
    await engineA.update(0)
    await engineB.update(0)
    expect(env.connection.interceptedMessages).toEqual([])
  })

  // create the components for both engines
  const int8A = int8Component(engineA)
  const int8B = int8Component(engineB)

  it('and add the component value "3" to the entityA', async () => {
    // and add the component value "3" to the entityA
    int8A.create(entityA, 3)

    // naturally, both engines will have divergent states
    expect(int8A.has(entityA)).toBe(true)
    expect(int8B.has(entityA)).toBe(false)

    // and the dirtyIterator of the component should of course contain the dirty entity
    expect(Array.from(int8A.dirtyIterator())).toEqual([entityA])
  })

  it('then we run a tick in the dirty engine, and the component should be no longer dirty', async () => {
    await engineA.update(0)
    expect(Array.from(int8A.dirtyIterator())).toEqual([])

    // and the engineA should have sent ONLY ONE message to update this entity and component
    expect(env.connection.interceptedMessages).toMatchObject([
      {
        direction: 'a->b',
        componentId: int8A.componentId,
        entityId: entityA,
        data: Uint8Array.of(3),
        timestamp: 1
      }
    ])
    env.connection.interceptedMessages = []

    // if we update the engine again, then NO MESSAGE should be sent. because the
    // component is not dirty
    await engineA.update(0)
    expect(env.connection.interceptedMessages).toEqual([])
  })

  it('then we will run the update on the engineB, to process the "queued" update', async () => {
    await engineB.update(0)

    // to verify that the queue got processed, we check the component
    expect(int8B.get(entityA)).toBe(3)

    // and the dirty iterator should be false
    expect(Array.from(int8B.dirtyIterator())).toEqual([])

    // and since there was no updates on this end. no messages should be sent
    // through the wire
    expect(env.connection.interceptedMessages).toEqual([])
  })

  it(`now, if we update the component from engineB's end it should fly back to engineA`, async () => {
    updateIntB(entityA, 4)
    // We update the value in a system, so it will only be updated once it's called
    expect(Array.from(int8B.dirtyIterator())).toEqual([])
    await engineB.update(0)

    // to reach consistent states, the message flying to the engineA should have
    // an incremented timestamp and the new value
    expect(env.connection.interceptedMessages).toMatchObject([
      {
        direction: 'b->a',
        componentId: int8A.componentId,
        entityId: entityA,
        data: Uint8Array.of(4),
        timestamp: 2
      }
    ])
    env.connection.interceptedMessages = []
  })

  it('then we do the processing on engineA to apply the changes', async () => {
    await engineA.update(0)

    // and assert
    expect(int8A.get(entityA)).toBe(4)
  })

  describe('conflict resolution case 1', () => {
    it('test conflicting timestamps resolution', async () => {
      // now we are going to make things a little bit spicy, we will send a message
      // with conflicts between the two engines. at this moment both converged towards
      // the same state. the value will be changed to 16 in the engineA and 32 on
      // the engineB, increasing the timestamp of both internal states
      updateIntA(entityA, 16)
      updateIntB(entityA, 32)

      // to generate a "conflict", we will send the updates from A to B first
      await engineA.update(0)
      expect(env.connection.interceptedMessages).toMatchObject([
        // this value will have the same timestamp in both engines
        {
          direction: 'a->b',
          componentId: int8A.componentId,
          entityId: entityA,
          data: Uint8Array.of(16),
          timestamp: 3
        }
      ])
      expect(int8A.get(entityA)).toBe(16)
      env.connection.interceptedMessages = []
    })

    it('now we are receiving the updates from engineA', async () => {
      // and then process in B, which will also send its updates
      await engineB.update(0)
      expect(int8B.get(entityA)).toBe(32)

      // in this case, the engineA sends its updates to the engineB.
      // but the engineB responds with an outdatedMessage, to converge the state of
      // engineA towards the same value
      expect(env.connection.interceptedMessages).toMatchObject([
        {
          direction: 'b->a',
          componentId: int8A.componentId,
          entityId: entityA,
          data: Uint8Array.of(32),
          timestamp: 4
        }
      ])
      env.connection.interceptedMessages = []
      await engineB.update(0)

      // // process the incoming "correction" message
      await engineA.update(0)
      // // no messages should be emitted from engineA because it is receiving a "correction"
      expect(env.connection.interceptedMessages).toMatchObject([])

      // // now both values converged towards the same value
      expect(int8A.get(entityA)).toBe(32)
      expect(int8B.get(entityA)).toBe(32)
    })
  })

  describe('conflict resolution case 2', () => {
    it('now that engines have the same conflict-free state, we are repeating the same but with inverted values', async () => {
      updateIntA(entityA, 48)
      updateIntB(entityA, 45)

      // to generate a "conflict", we will send the updates from A to B first
      await Promise.all([engineA.update(0), engineB.update(0)])
      expect(env.connection.interceptedMessages).toMatchObject([
        // this value will have has the same timestamp in both engines
        {
          direction: 'a->b',
          componentId: int8A.componentId,
          entityId: entityA,
          data: Uint8Array.of(48),
          timestamp: 5
        },
        {
          direction: 'b->a',
          componentId: int8A.componentId,
          entityId: entityA,
          data: Uint8Array.of(45),
          timestamp: 5
        }
      ])
      env.connection.interceptedMessages = []
    })

    it('now we are receiving the updates from engineA', async () => {
      expect(int8A.get(entityA)).toBe(48)
      expect(int8B.get(entityA)).toBe(45)

      await Promise.all([engineA.update(0), engineB.update(0)])
      expect(env.connection.interceptedMessages).toMatchObject([
        {
          direction: 'a->b',
          componentId: int8A.componentId,
          entityId: entityA,
          data: Uint8Array.of(48),
          timestamp: 5
        }
      ])
      env.connection.interceptedMessages = []
      await Promise.all([engineA.update(0), engineB.update(0)])
      expect(env.connection.interceptedMessages).toMatchObject([])

      expect(int8A.get(entityA)).toBe(48)
      expect(int8B.get(entityA)).toBe(48)
    })
  })
  describe('conflict resolution case 3', () => {
    it('now that engines have the same conflict-free state, we are going to remove a component outside a fn and receive and update of the same component from the other engine', async () => {
      int8A.deleteFrom(entityA)
      updateIntB(entityA, 88)

      // We send the message from B -> A
      await engineB.update(0)
      expect(env.connection.interceptedMessages).toMatchObject([
        // this value will have has the same timestamp in both engines
        {
          direction: 'b->a',
          componentId: int8A.componentId,
          entityId: entityA,
          data: Uint8Array.of(88),
          timestamp: 6
        }
      ])
      env.connection.interceptedMessages = []
    })

    it('now we are receiving the updates from engineB', async () => {
      // run update tick on engineA so we receive the message of the component that we already remove
      await engineA.update(0)

      // The conflict here is with same timestamp, `engineA` has removed the component, and `engineB` modified it.
      //  The "greater" data wins here, so the state converges to `engineB` LWW.

      expect(env.connection.interceptedMessages).toMatchObject([])

      await Promise.all([engineA.update(0), engineB.update(0)])
      expect(env.connection.interceptedMessages).toMatchObject([])

      expect(int8A.getOrNull(entityA)).toBe(88)
      expect(int8B.getOrNull(entityA)).toBe(88)
    })
  })
  describe('conflict resolution case 4', () => {
    it('same as case 3) but with roles inverted', async () => {
      int8B.deleteFrom(entityA)
      updateIntA(entityA, 114)

      // We send the message from A -> B
      await engineA.update(0)
      expect(env.connection.interceptedMessages).toMatchObject([
        // this value will have has the same timestamp in both engines
        {
          direction: 'a->b',
          entityId: entityA,
          data: Uint8Array.of(114),
          timestamp: 7
        }
      ])
      env.connection.interceptedMessages = []
    })

    it('now we are receiving the updates from engineA', async () => {
      // run update tick on engineA so we receive the message of the component that we already remove
      await engineB.update(0)
      expect(env.connection.interceptedMessages).toMatchObject([])

      await Promise.all([engineA.update(0), engineB.update(0)])
      expect(env.connection.interceptedMessages).toMatchObject([])

      expect(int8A.getOrNull(entityA)).toBe(114)
      expect(int8B.getOrNull(entityA)).toBe(114)
    })
  })
  describe('conflict resolution case 5', () => {
    it('the entity is deleted, this operation wins always', async () => {
      removeEntityB(entityA)
      updateIntA(entityA, 118)

      // We send the message from A -> B
      await engineA.update(0)
      expect(env.connection.interceptedMessages).toMatchObject([
        {
          direction: 'a->b',
          componentId: int8A.componentId,
          entityId: entityA,
          data: Uint8Array.of(118),
          timestamp: 8
        }
      ])
      env.connection.interceptedMessages = []
    })

    it('now we are receiving the updates from engineA and finally the entity is removed and sync', async () => {
      expect(engineB.getEntityState(entityA)).toBe(EntityState.UsedEntity)
      expect(int8B.getOrNull(entityA)).not.toBe(null)

      // the entity was deleted, so, the final state is removed
      await engineB.update(0)
      expect(engineB.getEntityState(entityA)).toBe(EntityState.Removed)
      expect(int8B.getOrNull(entityA)).toBe(null)

      expect(env.connection.interceptedMessages).toMatchObject([
        // this value will have has the same timestamp in both engines
        {
          componentId: int8A.componentId,
          direction: 'b->a',
          entityId: entityA,
          timestamp: 9,
          type: CrdtMessageType.DELETE_COMPONENT
        },
        {
          direction: 'b->a',
          type: CrdtMessageType.DELETE_ENTITY,
          entityId: entityA
        }
      ])
      env.connection.interceptedMessages = []

      await engineB.update(0)
      expect(env.connection.interceptedMessages).toMatchObject([])

      await engineA.update(0)
      expect(int8A.getOrNull(entityA)).toBe(null)

      await Promise.all([engineA.update(0), engineB.update(0)])
      expect(env.connection.interceptedMessages).toMatchObject([])

      expect(int8B.getOrNull(entityA)).toBe(null)
      expect(int8A.getOrNull(entityA)).toBe(null)
    })
  })
})
