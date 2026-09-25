import { IEngine, Entity, Engine, Schemas } from '../../../../packages/@dcl/ecs/dist'
import * as components from '../../../../packages/@dcl/ecs/src/components'
import { addSyncTransport } from '../../../../packages/@dcl/sdk/network/message-bus-sync'
import { encodeString } from '../../../../packages/@dcl/sdk/network/binary-message-bus'
import type { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'

type Peer = 'clientA' | 'clientB' | 'authoritative-server'
type ScoreValue = { currentValue: { value: number } | undefined; newValue: { value: number } | undefined | null }

function defineComponents(engine: IEngine) {
  return {
    Transform: components.Transform(engine as any),
    NetworkEntity: components.NetworkEntity(engine as any),
    NetworkParent: components.NetworkParent(engine as any),
    SyncComponents: components.SyncComponents(engine as any),
    EngineInfo: components.EngineInfo(engine as any),
    Score: engine.defineComponent('test::Score', { value: Schemas.Int })
  }
}

type Participant = { engine: IEngine; components: ReturnType<typeof defineComponents> }

function createNetwork() {
  const queues: Record<Peer, Uint8Array[]> = { clientA: [], clientB: [], 'authoritative-server': [] }

  function route(data: Uint8Array, addresses: string[], sender: Peer) {
    const senderBytes = encodeString(sender)
    const message = new Uint8Array(data.byteLength + senderBytes.byteLength + 1)
    message.set([senderBytes.byteLength], 0)
    message.set(senderBytes, 1)
    message.set(data, senderBytes.byteLength + 1)
    const targets: Peer[] =
      sender !== 'authoritative-server'
        ? ['authoritative-server']
        : addresses.length === 0
          ? ['clientA', 'clientB']
          : (addresses.filter((address) => address === 'clientA' || address === 'clientB') as Peer[])
    for (const target of targets) queues[target].push(message)
  }

  function join(peer: Peer, isServer: boolean): Participant & { sync: ReturnType<typeof addSyncTransport> } {
    const engine = Engine()
    const defined = defineComponents(engine)
    const sendBinary = async (request: SendBinaryRequest): Promise<SendBinaryResponse> => {
      for (const peerData of request.peerData) for (const data of peerData.data) route(data, peerData.address, peer)
      return { data: queues[peer].splice(0) }
    }
    const sync = addSyncTransport(
      engine,
      sendBinary,
      async () => ({
        data: { userId: peer, version: 1, displayName: peer, hasConnectedWeb3: true, avatar: undefined }
      }),
      async () => ({ isServer }),
      peer
    )
    defined.EngineInfo.create(engine.RootEntity, { tickNumber: 400, frameNumber: 400, totalRuntime: 1 })
    return { engine, components: defined, sync }
  }

  const clientA = join('clientA', false)
  const clientB = join('clientB', false)
  const server = join('authoritative-server', true)

  async function tick() {
    for (let i = 0; i < 4; i++) {
      await clientA.engine.update(1)
      await server.engine.update(1)
      await clientB.engine.update(1)
    }
  }

  return { clientA, clientB, server, tick }
}

function scoreOf(participant: Participant, reference: Participant, referenceEntity: Entity): number | null {
  const network = reference.components.NetworkEntity.get(referenceEntity)
  for (const [entity, candidate] of participant.engine.getEntitiesWith(participant.components.NetworkEntity)) {
    if (candidate.entityId === network.entityId && candidate.networkId === network.networkId) {
      return participant.components.Score.getOrNull(entity)?.value ?? null
    }
  }
  return null
}

describe('when the server rejects a synced component write', () => {
  let network: ReturnType<typeof createNetwork>
  let reject: (value: ScoreValue) => boolean
  let entity: Entity

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    network = createNetwork()
    reject = () => false
    network.server.components.Score.validateBeforeChange((value) => !reject(value as ScoreValue))
    await network.tick()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('and the server has never held the component', () => {
    beforeEach(async () => {
      const { clientA } = network
      entity = clientA.engine.addEntity()
      clientA.components.Transform.create(entity, {})
      clientA.sync.syncEntity(entity, [clientA.components.Transform.componentId, clientA.components.Score.componentId])
      await network.tick()
      reject = (value) => value.currentValue === undefined
      clientA.components.Score.create(entity, { value: 5 })
      await network.tick()
    })

    it('should remove the rejected component from the client that wrote it', () => {
      expect(network.clientA.components.Score.getOrNull(entity)).toBeNull()
    })

    it('should not deliver the rejected component to the other client', () => {
      expect(scoreOf(network.clientB, network.clientA, entity)).toBeNull()
    })

    describe('and the client writes the component again', () => {
      beforeEach(async () => {
        network.clientA.components.Score.create(entity, { value: 6 })
        await network.tick()
      })

      it('should remove the component from the client again', () => {
        expect(network.clientA.components.Score.getOrNull(entity)).toBeNull()
      })
    })
  })

  describe('and the component arrives with a newly synced entity', () => {
    beforeEach(async () => {
      const { clientA } = network
      reject = (value) => value.currentValue === undefined
      entity = clientA.engine.addEntity()
      clientA.components.Transform.create(entity, {})
      clientA.components.Score.create(entity, { value: 7 })
      clientA.sync.syncEntity(entity, [clientA.components.Transform.componentId, clientA.components.Score.componentId])
      await network.tick()
    })

    it('should remove the rejected component from the client that wrote it', () => {
      expect(network.clientA.components.Score.getOrNull(entity)).toBeNull()
    })

    it('should keep the accepted components on the client', () => {
      expect(network.clientA.components.Transform.has(entity)).toBe(true)
    })
  })

  describe('and the server deleted the component earlier', () => {
    beforeEach(async () => {
      const { clientA } = network
      entity = clientA.engine.addEntity()
      clientA.components.Transform.create(entity, {})
      clientA.components.Score.create(entity, { value: 1 })
      clientA.sync.syncEntity(entity, [clientA.components.Transform.componentId, clientA.components.Score.componentId])
      await network.tick()
      clientA.components.Score.deleteFrom(entity)
      await network.tick()
      reject = (value) => value.currentValue === undefined
      clientA.components.Score.create(entity, { value: 2 })
      await network.tick()
    })

    it('should remove the rejected component from the client that wrote it', () => {
      expect(network.clientA.components.Score.getOrNull(entity)).toBeNull()
    })
  })

  describe('and the server holds a value for the component', () => {
    beforeEach(async () => {
      const { clientA } = network
      entity = clientA.engine.addEntity()
      clientA.components.Transform.create(entity, {})
      clientA.components.Score.create(entity, { value: 1 })
      clientA.sync.syncEntity(entity, [clientA.components.Transform.componentId, clientA.components.Score.componentId])
      await network.tick()
      reject = (value) => (value.newValue?.value ?? 0) >= 100
      clientA.components.Score.getMutable(entity).value = 200
      await network.tick()
    })

    it("should restore the server's value on the client that wrote it", () => {
      expect(network.clientA.components.Score.get(entity).value).toBe(1)
    })
  })
})

describe('when the server accepts a synced component added by a client', () => {
  let network: ReturnType<typeof createNetwork>
  let entity: Entity

  beforeEach(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined)
    network = createNetwork()
    await network.tick()
    const { clientA } = network
    entity = clientA.engine.addEntity()
    clientA.components.Transform.create(entity, {})
    clientA.components.Score.create(entity, { value: 3 })
    clientA.sync.syncEntity(entity, [clientA.components.Transform.componentId, clientA.components.Score.componentId])
    await network.tick()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should keep the component on the client that wrote it', () => {
    expect(network.clientA.components.Score.get(entity).value).toBe(3)
  })

  it('should deliver the component to the other client', () => {
    expect(scoreOf(network.clientB, network.clientA, entity)).toBe(3)
  })
})
