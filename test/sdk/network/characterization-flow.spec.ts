/**
 * Characterization: end-to-end message flow over the 3-engine harness
 * (authoritative server + 2 clients).
 *
 * These tests pin CURRENT behavior — including the quirks, which are marked with
 * `QUIRK(pinned)` and are expected to be deleted/moved once the corresponding
 * defect is fixed (each quirk has a matching red test in `defects-red.spec.ts`).
 *
 * Already covered elsewhere (not duplicated here):
 *   - client A -> server -> client B propagation of a synced Transform,
 *     bidirectional updates and server-originated entities:
 *     `server-client-connectivity.spec.ts`
 *   - server-side validateBeforeChange / dry-run invocation:
 *     `server-client-connectivity.spec.ts`
 *   - 12KB chunking of outgoing CRDT: `crdt-chunking.spec.ts`,
 *     `chunking-debug.spec.ts`, `network-transport.spec.ts`
 *
 * What is new here: the REQ/RES_CRDT_STATE hydration handshake, late-join
 * hydration, the room (CUSTOM_EVENT) round-trip incl. queueing and targeted
 * sends, and the convergence oracle applied at the end of every scenario.
 */
import { Schemas } from '../../../packages/@dcl/ecs'
import { CommsMessage } from '../../../packages/@dcl/sdk/src/network/binary-message-bus'
import { registerMessages } from '../../../packages/@dcl/sdk/src/network/events/implementation'
import { expectConvergence } from './utils/convergence'
import { CLIENT_A, CLIENT_B, SERVER, createHarness, flush, setRealmConnected } from './utils/harness'

const Messages = {
  ping: Schemas.Map({ text: Schemas.String }),
  pong: Schemas.Map({ text: Schemas.String })
}

describe('network flow characterization', () => {
  const harness = createHarness()
  const { clientA, clientB, server } = harness

  it('hydration handshake: clients request state on connect and the server answers each sender', async () => {
    harness.clear()
    await harness.connect()

    const requests = harness.sentBy(CLIENT_A, CommsMessage.REQ_CRDT_STATE)
    expect(requests.length).toBeGreaterThanOrEqual(1)
    // QUIRK(pinned): the state request is broadcast to every peer instead of
    // being addressed to the authoritative server — see defect #1/#10.
    expect(requests[0].to).toEqual([])

    const responses = harness.sentBy(SERVER, CommsMessage.RES_CRDT_STATE)
    expect(responses.map((response) => response.to)).toEqual(expect.arrayContaining([[CLIENT_A], [CLIENT_B]]))
    // the server is empty at this point, so the answer is the empty payload branch
    expect(responses.every((response) => response.payload.byteLength === 0)).toBe(true)

    expect(clientA.sync.isStateSyncronized()).toBe(true)
    expect(clientB.sync.isStateSyncronized()).toBe(true)
    // QUIRK(pinned): the server never receives a RES_CRDT_STATE, so its own
    // isStateSyncronized() stays false forever — see defect #14.
    expect(server.sync.isStateSyncronized()).toBe(false)
    expect(clientA.sync.isRoomReadyAtom.getOrNull()).toBe(true)
    expect(server.sync.isRoomReadyAtom.getOrNull()).toBe(true)
  })

  it('client write is validated by the server, broadcast, and converges on the other client', async () => {
    harness.clear()
    const entity = clientA.engine.addEntity()
    clientA.components.Transform.create(entity, { position: { x: 1, y: 2, z: 3 } })
    clientA.sync.syncEntity(entity, [clientA.components.Transform.componentId])

    await harness.tick()

    const networkId = clientA.sync.myProfile.networkId
    const [serverEntity] = Array.from(server.engine.getEntitiesWith(server.components.NetworkEntity)).filter(
      ([, network]) => network.networkId === networkId && network.entityId === entity
    )[0]
    expect(server.components.Transform.get(serverEntity).position).toMatchObject({ x: 1, y: 2, z: 3 })
    // the server records the author of every entity it learns from a client
    expect(server.components.CreatedBy.get(serverEntity).address).toBe(CLIENT_A)

    const [clientBEntity] = Array.from(clientB.engine.getEntitiesWith(clientB.components.NetworkEntity)).filter(
      ([, network]) => network.networkId === networkId && network.entityId === entity
    )[0]
    expect(clientB.components.Transform.get(clientBEntity).position).toMatchObject({ x: 1, y: 2, z: 3 })

    // QUIRK(pinned): a client emits CRDT with an empty address list (broadcast)
    // rather than addressing the server — see defect #10.
    expect(harness.sentBy(CLIENT_A, CommsMessage.CRDT)[0].to).toEqual([])
    // QUIRK(pinned): the server re-broadcasts to everybody, so the originating
    // client receives an echo of its own write — see defect #11.
    expect(harness.sentBy(SERVER, CommsMessage.CRDT)[0].to).toEqual([])
    expect(harness.deliveredTo(CLIENT_A, CommsMessage.CRDT).length).toBeGreaterThanOrEqual(1)

    expectConvergence({ server: server.engine, clientA: clientA.engine, clientB: clientB.engine })
  })

  it('late joiner asks for state and the server answers with the full dump targeted to the sender', async () => {
    const clientC = harness.attach('clientC', false)
    harness.clear()
    await flush()
    setRealmConnected(true)
    await harness.tick(6)

    const responsesToC = harness
      .sentBy(SERVER, CommsMessage.RES_CRDT_STATE)
      .filter((response) => response.to.includes('clientC'))
    expect(responsesToC.length).toBeGreaterThanOrEqual(1)
    // targeted to the requester only
    expect(responsesToC[0].to).toEqual(['clientC'])
    expect(responsesToC[0].payload.byteLength).toBeGreaterThan(0)

    expect(clientC.sync.isStateSyncronized()).toBe(true)
    expect(harness.entities(clientC)).toHaveLength(1)
    expectConvergence({
      server: server.engine,
      clientA: clientA.engine,
      clientB: clientB.engine,
      clientC: clientC.engine
    })
  })

  it('room messages: client -> server carries the sender context, server -> client is filtered by sender', async () => {
    registerMessages(Messages)
    harness.clear()

    const serverInbox: { text: string; from?: string }[] = []
    const clientAInbox: string[] = []
    const clientBInbox: string[] = []
    server.sync.eventBus.onMessage('ping', (data: { text: string }, context?: { from: string }) => {
      serverInbox.push({ text: data.text, from: context?.from })
    })
    clientA.sync.eventBus.onMessage('pong', (data: { text: string }) => clientAInbox.push(data.text))
    clientB.sync.eventBus.onMessage('pong', (data: { text: string }) => clientBInbox.push(data.text))

    await clientA.sync.eventBus.send('ping', { text: 'from-a' })
    await harness.tick()

    expect(serverInbox).toEqual([{ text: 'from-a', from: CLIENT_A }])

    // SendOptions.to => only the addressed client receives it
    await server.sync.eventBus.send('pong', { text: 'only-b' }, { to: [CLIENT_B] })
    await harness.tick()
    expect(clientBInbox).toEqual(['only-b'])
    expect(clientAInbox).toEqual([])

    // no options => broadcast to every client
    await server.sync.eventBus.send('pong', { text: 'everyone' })
    await harness.tick()
    expect(clientAInbox).toEqual(['everyone'])
    expect(clientBInbox).toEqual(['only-b', 'everyone'])
  })

  it('room messages sent before the room is ready are queued and flushed on readiness', async () => {
    const queuedHarness = createHarness()
    registerMessages(Messages)
    const inbox: string[] = []
    queuedHarness.server.sync.eventBus.onMessage('ping', (data: { text: string }) => inbox.push(data.text))

    expect(queuedHarness.clientA.sync.eventBus.isReady()).toBe(false)
    await queuedHarness.clientA.sync.eventBus.send('ping', { text: 'queued' })
    await queuedHarness.tick()

    expect(queuedHarness.sentBy(CLIENT_A, CommsMessage.CUSTOM_EVENT)).toHaveLength(0)
    expect(inbox).toEqual([])

    await queuedHarness.connect()
    await queuedHarness.tick()

    expect(queuedHarness.clientA.sync.eventBus.isReady()).toBe(true)
    expect(queuedHarness.sentBy(CLIENT_A, CommsMessage.CUSTOM_EVENT)).toHaveLength(1)
    expect(inbox).toEqual(['queued'])
  })

  it('QUIRK(pinned): a non-server peer answers REQ_CRDT_STATE — see defect #1', async () => {
    // will move to the red suite when the responder gets an isServer guard
    harness.clear()
    harness.inject(CLIENT_A, CLIENT_B, CommsMessage.REQ_CRDT_STATE, new Uint8Array())
    await harness.tick()

    expect(harness.sentBy(CLIENT_A, CommsMessage.RES_CRDT_STATE).map((response) => response.to)).toEqual([[CLIENT_B]])
  })
})
