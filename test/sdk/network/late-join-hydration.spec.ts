/**
 * A peer that joins a world already in progress must end up holding exactly that
 * world, and must keep asking for it until somebody answers. Every scenario ends
 * on the convergence oracle.
 */
import { Entity } from '../../../packages/@dcl/ecs'
import { CommsMessage } from '../../../packages/@dcl/sdk/src/network/binary-message-bus'
import { expectConvergence } from './utils/convergence'
import { CLIENT_A, Harness, Peer, createHarness, flush, setRealmConnected } from './utils/harness'

const LATE = 'clientLate'

/** `count` synced entities authored by clientA, one unit apart on x */
async function populate(harness: Harness, count: number): Promise<Entity[]> {
  const entities: Entity[] = []
  for (let i = 0; i < count; i++) {
    const entity = harness.clientA.engine.addEntity()
    harness.clientA.components.Transform.create(entity, { position: { x: i, y: 0, z: 0 } })
    harness.clientA.sync.syncEntity(entity, [harness.clientA.components.Transform.componentId])
    entities.push(entity)
  }
  await harness.tick()
  return entities
}

/** attaches a peer that was not around when the world was built */
async function joinLate(harness: Harness): Promise<Peer> {
  const late = harness.attach(LATE, false)
  await flush()
  setRealmConnected(true)
  return late
}

describe('late join hydration', () => {
  it('hands a fresh peer the whole world', async () => {
    const harness = createHarness()
    await harness.connect()
    await populate(harness, 3)
    expect(harness.entities(harness.server)).toHaveLength(3)

    const late = await joinLate(harness)
    await harness.tick(6)

    expect(late.sync.isStateSyncronized()).toBe(true)
    expect(harness.entities(late)).toHaveLength(3)
    expectConvergence({
      server: harness.server.engine,
      clientA: harness.clientA.engine,
      clientLate: late.engine
    })
  })

  it('asks the authoritative server, and nobody else answers', async () => {
    const harness = createHarness()
    await harness.connect()
    await populate(harness, 1)

    const late = await joinLate(harness)
    harness.clear()
    await harness.tick(6)

    expect(harness.sentBy(LATE, CommsMessage.REQ_CRDT_STATE).length).toBeGreaterThanOrEqual(1)
    // the other clients hear nothing of it: only the server is reachable, and only
    // the server answers
    expect(harness.sentBy(CLIENT_A, CommsMessage.RES_CRDT_STATE)).toHaveLength(0)
    expect(
      harness.deliveredTo(LATE, CommsMessage.RES_CRDT_STATE).every((record) => record.from === 'authoritative-server')
    ).toBe(true)
    expectConvergence({ server: harness.server.engine, clientLate: late.engine })
  })

  it('keeps asking while the answer never comes, and hydrates on the one that does', async () => {
    const harness = createHarness()
    await harness.connect()
    await populate(harness, 2)

    const late = await joinLate(harness)
    harness.clear()

    // three seconds of frames the server sleeps through
    for (let i = 0; i < 30; i++) await late.engine.update(0.1)

    expect(late.sync.isStateSyncronized()).toBe(false)
    expect(harness.entities(late)).toHaveLength(0)
    // the first request plus at least one retry across the 2s interval
    expect(harness.sentBy(LATE, CommsMessage.REQ_CRDT_STATE).length).toBeGreaterThanOrEqual(2)

    await harness.tick(6)

    expect(late.sync.isStateSyncronized()).toBe(true)
    expect(harness.entities(late)).toHaveLength(2)
    expectConvergence({
      server: harness.server.engine,
      clientA: harness.clientA.engine,
      clientLate: late.engine
    })
  })

  it('does not reconcile away what the joining peer created before the dump landed', async () => {
    const harness = createHarness()
    await harness.connect()
    await populate(harness, 1)

    const late = await joinLate(harness)
    const own = late.engine.addEntity()
    late.components.Transform.create(own, { position: { x: 9, y: 9, z: 9 } })
    late.sync.syncEntity(own, [late.components.Transform.componentId])
    await harness.tick(6)

    // a first join has nothing to reconcile against, so the local entity survives
    // and reaches the rest of the world the normal way
    expect(harness.entities(late)).toHaveLength(2)
    expectConvergence({
      server: harness.server.engine,
      clientA: harness.clientA.engine,
      clientLate: late.engine
    })
  })
})
