/**
 * Red suite: one test per known defect, each asserting the CORRECT behavior.
 *
 * An unfixed defect is declared with `it.failing`, so jest expects it to throw
 * today. When a phase fixes one its test starts passing and `it.failing` turns
 * red — that is the signal to flip it to a plain `it` (and to drop the matching
 * `QUIRK(pinned)` assertion from the characterization specs).
 *
 * Fixed in phase 1 (hydration FSM), now plain `it`: #1, #2, #6, #7, #9, #14.
 * Fixed in phase 2 (validator hardening), now plain `it`: #3, #4.
 * Fixed in phase 3 (codec unification), now plain `it`: #8.
 * Fixed in phase 4 (topology), now plain `it`: #10, #12.
 *
 * Fixed: 11. Deferred pending lower layers: 2 (#11, #13). Neither is fixable in
 * the network layer; the measurements and the upgrade paths are in
 * `docs/network-peer-visibility.md`.
 */
import { Engine, Entity, Schemas, Transform as GlobalTransform } from '../../../packages/@dcl/ecs'
import * as components from '../../../packages/@dcl/ecs/dist/components'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/dist/serialization/ByteBuffer'
import { DeleteEntityNetwork, PutComponentOperation } from '../../../packages/@dcl/ecs/dist/serialization/crdt'
import { CommsMessage } from '../../../packages/@dcl/sdk/src/network/binary-message-bus'
import { chunkCrdtMessages } from '../../../packages/@dcl/sdk/src/network/codec'
import { registerMessages } from '../../../packages/@dcl/sdk/src/network/events/implementation'
import { engineToCrdt } from '../../../packages/@dcl/sdk/src/network/state'
import { definePlayerHelper } from '../../../packages/@dcl/sdk/src/players'
import { expectConvergence } from './utils/convergence'
import {
  CLIENT_A,
  CLIENT_B,
  SERVER,
  createHarness,
  defineComponents,
  findNetworkEntity,
  flush,
  setRealmConnected
} from './utils/harness'

type Tagged = { networkId: number; entityId: Entity; position: { x: number; y: number; z: number } }

/** A RES_CRDT_STATE payload holding exactly the given network entities. */
async function stateDump(entities: Tagged[]): Promise<Uint8Array> {
  const engine = Engine()
  const local = defineComponents(engine)
  for (const { networkId, entityId, position } of entities) {
    const entity = engine.addEntity()
    local.NetworkEntity.create(entity, { networkId, entityId })
    local.SyncComponents.create(entity, { componentIds: [GlobalTransform.componentId] })
    local.Transform.create(entity, { position })
  }
  await engine.update(1)
  return engineToCrdt(engine)[0] ?? new Uint8Array()
}

describe('known defects (red: asserting the correct behavior)', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('#1 only the authoritative server answers REQ_CRDT_STATE', async () => {
    const harness = createHarness()
    await flush()
    harness.clear()

    harness.inject(CLIENT_A, CLIENT_B, CommsMessage.REQ_CRDT_STATE, new Uint8Array())
    await harness.tick()

    expect(harness.sentBy(CLIENT_A, CommsMessage.RES_CRDT_STATE)).toHaveLength(0)
  })

  it('#2 a stray RES_CRDT_STATE from a non-server peer must not halt the retry loop', async () => {
    const harness = createHarness()
    await flush()
    setRealmConnected(true)
    // only the client ticks: nobody answers its request. dt stays well under the
    // 2s STATE_REQUEST_RETRY_INTERVAL so the stray reply lands before any retry.
    await harness.clientA.engine.update(0.1)
    harness.inject(CLIENT_A, CLIENT_B, CommsMessage.RES_CRDT_STATE, new Uint8Array())
    await harness.clientA.engine.update(0.1)
    harness.clear()

    // 3 seconds of silence: the retry loop must have fired at least once
    for (let i = 0; i < 30; i++) await harness.clientA.engine.update(0.1)

    expect(harness.clientA.sync.isStateSyncronized()).toBe(false)
    expect(harness.sentBy(CLIENT_A, CommsMessage.REQ_CRDT_STATE).length).toBeGreaterThanOrEqual(1)

    // a later reply from the real server still hydrates (this half works today)
    harness.inject(CLIENT_A, SERVER, CommsMessage.RES_CRDT_STATE, new Uint8Array())
    await harness.clientA.engine.update(0.1)
    expect(harness.clientA.sync.isStateSyncronized()).toBe(true)
  })

  it('#3 the server rejects a DELETE_ENTITY for an entity the sender did not create', async () => {
    const harness = createHarness()
    await flush()

    const entity = harness.clientA.engine.addEntity()
    harness.clientA.components.Transform.create(entity, { position: { x: 1, y: 1, z: 1 } })
    harness.clientA.sync.syncEntity(entity, [harness.clientA.components.Transform.componentId])
    await harness.tick()

    const serverEntity = findNetworkEntity(harness.server, harness.clientA.sync.myProfile.networkId, entity)!
    expect(harness.server.components.CreatedBy.get(serverEntity).address).toBe(CLIENT_A)

    // clientB, which did not create it, asks the server to delete it
    const deletion = new ReadWriteByteBuffer()
    DeleteEntityNetwork.write(entity, harness.clientA.sync.myProfile.networkId, deletion)
    harness.clear()
    harness.inject(SERVER, CLIENT_B, CommsMessage.CRDT, deletion.toBinary())
    await harness.tick()

    expect(harness.server.components.NetworkEntity.has(serverEntity)).toBe(true)
    expect(harness.sentBy(SERVER, CommsMessage.CRDT)).toHaveLength(0)
  })

  it('#4 a rejected first write is corrected with CRDT_AUTHORITATIVE to the offender', async () => {
    const harness = createHarness()
    await flush()
    harness.server.components.Transform.validateBeforeChange(
      (value) => !(value.newValue?.position.x ?? 0) || value.newValue!.position.x <= 500
    )

    const entity = harness.clientA.engine.addEntity()
    harness.clientA.components.Transform.create(entity, { position: { x: 600, y: 0, z: 0 } })
    harness.clientA.sync.syncEntity(entity, [harness.clientA.components.Transform.componentId])
    harness.clear()
    await harness.tick()

    // the server holds no state for the component, so the only correction it can
    // state is "you do not have this component" — hence getOrNull, the offender is
    // left with no Transform at all rather than with a different one
    const corrections = harness.sentBy(SERVER, CommsMessage.CRDT_AUTHORITATIVE)
    expect(corrections.map((correction) => correction.to)).toEqual([[CLIENT_A]])
    expect(harness.clientA.components.Transform.getOrNull(entity)?.position.x).not.toBe(600)
    expectConvergence({ server: harness.server.engine, clientA: harness.clientA.engine })
  })

  it('#6 re-hydration removes network entities missing from the new full state', async () => {
    const harness = createHarness()
    await harness.connect()

    const own = harness.clientA.engine.addEntity()
    harness.clientA.components.Transform.create(own, { position: { x: 1, y: 1, z: 1 } })
    harness.clientA.sync.syncEntity(own, [harness.clientA.components.Transform.componentId])
    const ghost = harness.clientB.engine.addEntity()
    harness.clientB.components.Transform.create(ghost, { position: { x: 2, y: 2, z: 2 } })
    harness.clientB.sync.syncEntity(ghost, [harness.clientB.components.Transform.componentId])
    await harness.tick()
    expect(harness.entities(harness.clientA)).toHaveLength(2)

    // clientA drops out and comes back to a world where `ghost` no longer exists
    setRealmConnected(false)
    await harness.clientA.engine.update(1)
    const dump = await stateDump([
      { networkId: harness.clientA.sync.myProfile.networkId, entityId: own, position: { x: 1, y: 1, z: 1 } }
    ])
    harness.inject(CLIENT_A, SERVER, CommsMessage.RES_CRDT_STATE, dump)
    await harness.tick()

    expect(harness.entities(harness.clientA)).toHaveLength(1)
  })

  it('#7 a restarted server makes its clients re-hydrate', async () => {
    const harness = createHarness()
    await harness.connect()

    const stale = harness.clientA.engine.addEntity()
    harness.clientA.components.Transform.create(stale, { position: { x: 1, y: 1, z: 1 } })
    harness.clientA.sync.syncEntity(stale, [harness.clientA.components.Transform.componentId])
    await harness.tick()

    // same comms identity, brand new engine, and some fresh state of its own
    const restarted = harness.attach(SERVER, true)
    await flush()
    harness.clear()
    const fresh = restarted.engine.addEntity()
    restarted.components.Transform.create(fresh, { position: { x: 9, y: 9, z: 9 } })
    restarted.sync.syncEntity(fresh, [restarted.components.Transform.componentId])
    await harness.tick(8)

    expect(harness.sentBy(CLIENT_A, CommsMessage.REQ_CRDT_STATE).length).toBeGreaterThanOrEqual(1)
    expectConvergence({ restartedServer: restarted.engine, clientA: harness.clientA.engine })
  })

  it('#8 dropping an oversized message always names the component and its size', async () => {
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})

    // the state dump path
    const engine = Engine()
    const local = defineComponents(engine)
    const Big = engine.defineComponent('test::Big', { blob: Schemas.String })
    const entity = engine.addEntity()
    local.NetworkEntity.create(entity, { networkId: 1, entityId: entity })
    Big.create(entity, { blob: 'x'.repeat(13 * 1024) })
    await engine.update(1)
    engineToCrdt(engine)
    expect(error).toHaveBeenCalledWith(expect.stringContaining(`component ${Big.componentId}`))

    // ...and the chunking path, which reports it through the same code
    error.mockClear()
    const oversized = new ReadWriteByteBuffer()
    PutComponentOperation.write(512 as Entity, 1, GlobalTransform.componentId, new Uint8Array(13 * 1024), oversized)
    expect(chunkCrdtMessages(oversized.toBinary(), 12)).toEqual([])
    expect(error).toHaveBeenCalledWith(expect.stringContaining(`component ${GlobalTransform.componentId}`))
  })

  it('#9 CRDT that arrives before the role resolves is buffered, not dropped', async () => {
    const harness = createHarness()
    let resolveRole!: (isServer: boolean) => void
    const role = new Promise<boolean>((resolve) => (resolveRole = resolve))
    const late = harness.attach(SERVER, role)
    await flush()

    const dump = await stateDump([{ networkId: 42, entityId: 512 as Entity, position: { x: 5, y: 5, z: 5 } }])
    harness.inject(SERVER, CLIENT_A, CommsMessage.CRDT, dump)
    await harness.tick()

    resolveRole(true)
    await flush()
    await harness.tick()

    expect(Array.from(late.engine.getEntitiesWith(late.components.NetworkEntity))).toHaveLength(1)
  })

  it('#10 a client addresses its CRDT to the authoritative server', async () => {
    const harness = createHarness()
    await flush()

    const entity = harness.clientA.engine.addEntity()
    harness.clientA.components.Transform.create(entity, { position: { x: 1, y: 2, z: 3 } })
    harness.clientA.sync.syncEntity(entity, [harness.clientA.components.Transform.componentId])
    harness.clear()
    await harness.tick()

    const crdt = harness.sentBy(CLIENT_A, CommsMessage.CRDT)
    expect(crdt.length).toBeGreaterThanOrEqual(1)
    expect(crdt.map((message) => message.to)).toEqual(crdt.map(() => [SERVER]))
  })

  // deferred: needs a host roster or a wire-level broadcast-except-X primitive.
  // Excluding one peer means naming all the others, and the server has no roster
  // to name them from — see `docs/network-peer-visibility.md`
  it.failing('#11 the server broadcast excludes the peer that sent the message', async () => {
    const harness = createHarness()
    await flush()

    const entity = harness.clientA.engine.addEntity()
    harness.clientA.components.Transform.create(entity, { position: { x: 1, y: 2, z: 3 } })
    harness.clientA.sync.syncEntity(entity, [harness.clientA.components.Transform.componentId])
    harness.clear()
    await harness.tick()

    expect(harness.deliveredTo(CLIENT_A, CommsMessage.CRDT)).toHaveLength(0)
    expect(harness.deliveredTo(CLIENT_B, CommsMessage.CRDT).length).toBeGreaterThanOrEqual(1)
  })

  it('#12 registering the same message key twice reports the collision', async () => {
    createHarness()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const error = jest.spyOn(console, 'error').mockImplementation(() => {})

    registerMessages({ collide: Schemas.Map({ text: Schemas.String }) })
    registerMessages({ collide: Schemas.Map({ value: Schemas.Int }) })

    expect(warn.mock.calls.length + error.mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  // deferred: needs a component-wide change subscription in @dcl/ecs — per-entity
  // `onChange` cannot be registered for an entity that does not exist yet. This
  // fixture writes locally, which collapses to a delete and loses the address
  // outright; over the wire the value does survive — see
  // `docs/network-peer-visibility.md`
  it.failing('#13 a player joining and leaving within one frame fires both callbacks', async () => {
    const engine = Engine()
    const players = definePlayerHelper(engine)
    const PlayerIdentityData = components.PlayerIdentityData(engine)
    const AvatarBase = components.AvatarBase(engine)

    const entered: string[] = []
    const left: string[] = []
    players.onEnterScene((player) => entered.push(player.userId))
    players.onLeaveScene((userId) => left.push(userId))

    const entity = engine.addEntity()
    PlayerIdentityData.create(entity, { address: '0xplayer', isGuest: false })
    AvatarBase.create(entity)
    // ...and gone before the engine ever ticks
    AvatarBase.deleteFrom(entity)
    PlayerIdentityData.deleteFrom(entity)
    await engine.update(1)

    expect(entered).toEqual(['0xplayer'])
    expect(left).toEqual(['0xplayer'])
  })

  it('#14 the server reports a synchronized state once it is ready', async () => {
    const harness = createHarness()
    await harness.connect()

    expect(harness.server.sync.isRoomReadyAtom.getOrNull()).toBe(true)
    expect(harness.server.sync.isStateSyncronized()).toBe(true)
  })
})
