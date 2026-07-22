import type { IEngine, LastWriteWinElementSetComponentDefinition, PBRealmInfo } from '../../../packages/@dcl/ecs/dist'
import type { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'

type OutgoingMessage = { type: number; tick: number; address: string[]; payload: Uint8Array }

function setupHarness(userId: string) {
  jest.resetModules()
  const ecs = jest.requireActual('../../../packages/@dcl/sdk/node_modules/@dcl/ecs') as any
  const { addSyncTransport } = jest.requireActual('../../../packages/@dcl/sdk/network/message-bus-sync') as any
  const { CommsMessage, encodeString } = jest.requireActual(
    '../../../packages/@dcl/sdk/network/binary-message-bus'
  ) as any
  const engine: IEngine = ecs.engine
  const RealmInfo: LastWriteWinElementSetComponentDefinition<PBRealmInfo> = ecs.RealmInfo
  const PlayerIdentityData = ecs.PlayerIdentityData

  let tick = 0
  const outgoing: OutgoingMessage[] = []
  const incoming: Uint8Array[] = []

  const sendBinary = async (msg: SendBinaryRequest): Promise<SendBinaryResponse> => {
    for (const peerMessage of msg.peerData) {
      for (const data of peerMessage.data) {
        outgoing.push({ type: data[0], tick, address: [...(peerMessage.address ?? [])], payload: data.subarray(1) })
      }
    }
    return { data: incoming.splice(0) }
  }

  const sync = addSyncTransport(engine, sendBinary, async () => ({
    data: { userId, version: 1, displayName: userId, hasConnectedWeb3: true, avatar: undefined }
  }))

  function envelope(sender: string, messageType: number, payload: Uint8Array = new Uint8Array()) {
    const senderBytes = encodeString(sender)
    const message = new Uint8Array(1 + senderBytes.byteLength + 1 + payload.byteLength)
    message.set([senderBytes.byteLength], 0)
    message.set(senderBytes, 1)
    message.set([messageType], 1 + senderBytes.byteLength)
    message.set(payload, 1 + senderBytes.byteLength + 1)
    return message
  }

  function crdtStatePayload(requester: string, data: Uint8Array = new Uint8Array()) {
    const addressBuffer = encodeString(requester)
    const serialized = new Uint8Array(1 + addressBuffer.byteLength + data.byteLength)
    serialized.set([addressBuffer.byteLength], 0)
    serialized.set(addressBuffer, 1)
    serialized.set(data, addressBuffer.byteLength + 1)
    return serialized
  }

  function addPlayer(address: string) {
    const entity = engine.addEntity()
    PlayerIdentityData.create(entity, { address, isGuest: false })
    ecs.AvatarBase.create(entity)
  }

  function connect(isConnectedSceneRoom: boolean) {
    const realmInfo = { baseUrl: '', realmName: '', networkId: 1, commsAdapter: '', isPreview: false }
    if (RealmInfo.has(engine.RootEntity)) {
      RealmInfo.getMutable(engine.RootEntity).isConnectedSceneRoom = isConnectedSceneRoom
    } else {
      RealmInfo.create(engine.RootEntity, { ...realmInfo, isConnectedSceneRoom })
    }
  }

  async function ticks(amount: number) {
    for (let i = 0; i < amount; i++) {
      await engine.update(1)
      tick++
    }
  }

  const requests = () => outgoing.filter(($) => $.type === CommsMessage.REQ_CRDT_STATE)
  const responses = () => outgoing.filter(($) => $.type === CommsMessage.RES_CRDT_STATE)

  return {
    engine,
    sync,
    CommsMessage,
    incoming,
    envelope,
    crdtStatePayload,
    addPlayer,
    connect,
    ticks,
    requests,
    responses
  }
}

describe('initial state sync: retries with capped exponential backoff', () => {
  it('keeps requesting the state while other players are connected', async () => {
    const harness = setupHarness('0xme')
    harness.addPlayer('0xme')
    harness.addPlayer('0xaaa')
    harness.addPlayer('0xbbb')
    harness.connect(true)

    await harness.ticks(40)

    const requestTicks = harness.requests().map(($) => $.tick)
    expect(requestTicks.length).toBeGreaterThanOrEqual(5)
    const gaps = requestTicks.slice(1).map((value, index) => value - requestTicks[index])
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1])
    }
    expect(Math.max(...gaps)).toBeLessThanOrEqual(30)
    expect(harness.sync.isStateSyncronized()).toBe(false)

    harness.incoming.push(
      harness.envelope('0xaaa', harness.CommsMessage.RES_CRDT_STATE, harness.crdtStatePayload('0xme'))
    )
    await harness.ticks(2)
    expect(harness.sync.isStateSyncronized()).toBe(true)

    const requestsAfterSync = harness.requests().length
    await harness.ticks(40)
    expect(harness.requests().length).toBe(requestsAfterSync)
  })

  it('redundant snapshots arriving after synchronization merge safely', async () => {
    const harness = setupHarness('0xme')
    harness.addPlayer('0xme')
    harness.addPlayer('0xaaa')
    harness.connect(true)
    await harness.ticks(2)

    harness.incoming.push(
      harness.envelope('0xaaa', harness.CommsMessage.RES_CRDT_STATE, harness.crdtStatePayload('0xme'))
    )
    await harness.ticks(1)
    expect(harness.sync.isStateSyncronized()).toBe(true)

    harness.incoming.push(
      harness.envelope('0xbbb', harness.CommsMessage.RES_CRDT_STATE, harness.crdtStatePayload('0xme'))
    )
    await harness.ticks(1)
    expect(harness.sync.isStateSyncronized()).toBe(true)
  })

  it('resolves as synchronized when there are no other players, after the alone floor', async () => {
    const harness = setupHarness('0xme')
    harness.addPlayer('0xme')
    harness.connect(true)

    await harness.ticks(5)
    expect(harness.sync.isStateSyncronized()).toBe(false)
    await harness.ticks(4)
    expect(harness.sync.isStateSyncronized()).toBe(true)
    expect(harness.requests().length).toBe(3)
  })

  it('re-requests when a player appears after an alone-resolve with no state received', async () => {
    const harness = setupHarness('0xme')
    harness.addPlayer('0xme')
    harness.connect(true)
    await harness.ticks(9)
    expect(harness.sync.isStateSyncronized()).toBe(true)

    harness.addPlayer('0xlate')
    await harness.ticks(2)
    expect(harness.sync.isStateSyncronized()).toBe(false)

    harness.incoming.push(
      harness.envelope('0xlate', harness.CommsMessage.RES_CRDT_STATE, harness.crdtStatePayload('0xme'))
    )
    await harness.ticks(2)
    expect(harness.sync.isStateSyncronized()).toBe(true)
  })

  it('gives up loudly after the ceiling when peers are present but nobody ever answers', async () => {
    const warn = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const harness = setupHarness('0xme')
      harness.addPlayer('0xme')
      harness.addPlayer('0xaaa')
      harness.connect(true)

      await harness.ticks(70)
      expect(harness.sync.isStateSyncronized()).toBe(true)
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('No answer to REQ_CRDT_STATE'))

      const requestsAtGiveUp = harness.requests().length
      await harness.ticks(20)
      expect(harness.requests().length).toBe(requestsAtGiveUp)
    } finally {
      warn.mockRestore()
    }
  })

  it('stops retrying while disconnected and resumes on reconnection', async () => {
    const harness = setupHarness('0xme')
    harness.addPlayer('0xme')
    harness.addPlayer('0xaaa')
    harness.connect(true)

    await harness.ticks(4)
    const requestsWhileConnected = harness.requests().length
    expect(requestsWhileConnected).toBeGreaterThanOrEqual(2)

    harness.connect(false)
    await harness.ticks(35)
    const requestsWhileDisconnected = harness.requests().length - requestsWhileConnected
    expect(requestsWhileDisconnected).toBeLessThanOrEqual(1)

    harness.connect(true)
    await harness.ticks(4)
    expect(harness.requests().length).toBeGreaterThan(requestsWhileConnected + requestsWhileDisconnected)
  })
})

describe('wire format contract', () => {
  it('REQ/RES ride the legacy CommsMessage bytes (2/3) of the main SDK line', () => {
    const harness = setupHarness('0xme')
    expect(harness.CommsMessage.CRDT).toBe(1)
    expect(harness.CommsMessage.REQ_CRDT_STATE).toBe(2)
    expect(harness.CommsMessage.RES_CRDT_STATE).toBe(3)
  })
})

describe('initial state sync: answering REQ_CRDT_STATE', () => {
  it('answers a REQ_CRDT_STATE with an empty ack when it has no state', async () => {
    const harness = setupHarness('0xme')
    harness.addPlayer('0xme')
    harness.addPlayer('0xreq')
    harness.connect(true)
    await harness.ticks(1)

    harness.incoming.push(harness.envelope('0xreq', harness.CommsMessage.REQ_CRDT_STATE))
    await harness.ticks(2)

    const responses = harness.responses()
    expect(responses).toHaveLength(1)
    expect(responses[0].address).toEqual(['0xreq'])
    expect(responses[0].payload).toEqual(harness.crdtStatePayload('0xreq'))
  })
})
