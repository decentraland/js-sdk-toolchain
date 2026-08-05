/**
 * What happens to a client that comes back to a world that moved on without it,
 * and to a whole room whose authoritative server was replaced underneath it.
 * Every scenario ends on the convergence oracle.
 */
import { Entity } from '../../../packages/@dcl/ecs'
import { CommsMessage } from '../../../packages/@dcl/sdk/src/network/binary-message-bus'
import { expectConvergence } from './utils/convergence'
import { CLIENT_A, Harness, Peer, SERVER, createHarness, flush, setRealmConnected } from './utils/harness'

function spawn(peer: Peer, position: { x: number; y: number; z: number }): Entity {
  const entity = peer.engine.addEntity()
  peer.components.Transform.create(entity, { position })
  peer.sync.syncEntity(entity, [peer.components.Transform.componentId])
  return entity
}

/** ticks everyone except the peer that is meant to be offline */
async function tickWithout(harness: Harness, offline: string, rounds = 4) {
  const online = Object.values(harness.peers).filter((peer) => peer.id !== offline)
  for (let i = 0; i < rounds; i++) await Promise.all(online.map((peer) => peer.engine.update(1)))
}

describe('reconnect convergence', () => {
  it('drops the ghost of an entity deleted while the client was away', async () => {
    const harness = createHarness()
    await harness.connect()

    const kept = spawn(harness.clientA, { x: 1, y: 1, z: 1 })
    const doomed = spawn(harness.clientB, { x: 2, y: 2, z: 2 })
    await harness.tick()
    expect(harness.entities(harness.clientA)).toHaveLength(2)

    setRealmConnected(false)
    harness.clientB.engine.removeEntity(doomed)
    await tickWithout(harness, CLIENT_A)
    // nothing was held for the peer that was not there
    harness.drop(CLIENT_A)
    expect(harness.entities(harness.server)).toHaveLength(1)

    setRealmConnected(true)
    await harness.tick(6)

    expect(harness.clientA.sync.isStateSyncronized()).toBe(true)
    expect(harness.entities(harness.clientA)).toEqual([kept])
    expectConvergence({
      server: harness.server.engine,
      clientA: harness.clientA.engine,
      clientB: harness.clientB.engine
    })
  })

  it('keeps the entities the world still has when the client reconnects', async () => {
    const harness = createHarness()
    await harness.connect()

    spawn(harness.clientA, { x: 1, y: 1, z: 1 })
    spawn(harness.clientB, { x: 2, y: 2, z: 2 })
    await harness.tick()

    setRealmConnected(false)
    await harness.clientA.engine.update(1)
    harness.drop(CLIENT_A)
    setRealmConnected(true)
    await harness.tick(6)

    // the dump named both, so reconciliation has nothing to take away
    expect(harness.entities(harness.clientA)).toHaveLength(2)
    expectConvergence({
      server: harness.server.engine,
      clientA: harness.clientA.engine,
      clientB: harness.clientB.engine
    })
  })

  it('re-hydrates every client onto a restarted server', async () => {
    const harness = createHarness()
    await harness.connect()

    spawn(harness.clientA, { x: 1, y: 1, z: 1 })
    spawn(harness.clientB, { x: 2, y: 2, z: 2 })
    await harness.tick()
    expect(harness.entities(harness.clientA)).toHaveLength(2)

    // same comms identity, brand new engine holding a world of its own
    const restarted = harness.attach(SERVER, true)
    await flush()
    harness.clear()
    spawn(restarted, { x: 9, y: 9, z: 9 })
    await harness.tick(8)

    expect(harness.sentBy(CLIENT_A, CommsMessage.REQ_CRDT_STATE).length).toBeGreaterThanOrEqual(1)
    // the two entities of the world that died are gone, the new one arrived
    expect(harness.entities(harness.clientA)).toHaveLength(1)
    expect(harness.entities(harness.clientB)).toHaveLength(1)
    expectConvergence({
      restartedServer: restarted.engine,
      clientA: harness.clientA.engine,
      clientB: harness.clientB.engine
    })
  })

  it('does not make a client re-hydrate while the same server keeps announcing itself', async () => {
    const harness = createHarness()
    await harness.connect()
    spawn(harness.clientA, { x: 1, y: 1, z: 1 })
    await harness.tick()
    harness.clear()

    // reconnecting the realm re-announces the very same generation
    setRealmConnected(true)
    await harness.tick(4)

    expect(harness.sentBy(CLIENT_A, CommsMessage.REQ_CRDT_STATE)).toHaveLength(0)
    expect(harness.clientA.sync.isStateSyncronized()).toBe(true)
    expectConvergence({ server: harness.server.engine, clientA: harness.clientA.engine })
  })
})
