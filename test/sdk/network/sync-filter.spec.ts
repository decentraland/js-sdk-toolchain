import { Engine, Entity, IEngine, CrdtMessage, CrdtMessageType, Transport } from '../../../packages/@dcl/ecs'
import * as components from '../../../packages/@dcl/ecs/src/components'
import { addSyncTransport } from '../../../packages/@dcl/sdk/src/network/message-bus-sync'
import { CommsMessage } from '../../../packages/@dcl/sdk/src/network/binary-message-bus'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { readMessage } from '../../../packages/@dcl/ecs/src/serialization/crdt/message'

import type { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'

function setup(onRendererSend?: () => void) {
  const engine: IEngine = Engine()
  const sent: CrdtMessage[] = []
  const renderer: Transport = {
    type: 'renderer',
    filter: () => true,
    send: async () => onRendererSend?.()
  }
  engine.addTransport(renderer)
  const Transform = components.Transform(engine)
  const GltfContainer = components.GltfContainer(engine)
  const VisibilityComponent = components.VisibilityComponent(engine)
  const NetworkEntity = components.NetworkEntity(engine)
  const SyncComponents = components.SyncComponents(engine)
  components.NetworkParent(engine)

  const sendBinary = async (msg: SendBinaryRequest): Promise<SendBinaryResponse> => {
    for (const peer of msg.peerData) {
      for (const data of peer.data) {
        if (data[0] !== CommsMessage.CRDT) continue
        const buffer = new ReadWriteByteBuffer(data.subarray(1), 0)
        let message: CrdtMessage | null
        while ((message = readMessage(buffer))) sent.push(message)
      }
    }
    return { data: [] }
  }

  const network = addSyncTransport(
    engine,
    sendBinary,
    async () => ({
      data: { userId: 'A', version: 1, displayName: 'A', hasConnectedWeb3: true, avatar: undefined }
    }),
    async () => ({ isServer: false }),
    'A'
  )

  function sentComponentIds(entityId: number) {
    return sent
      .filter(($) => $.type === CrdtMessageType.PUT_COMPONENT_NETWORK && $.entityId === entityId)
      .map(($) => ('componentId' in $ ? $.componentId : -1))
  }

  // Same shape processClientMessages gives an entity received from the server
  function createMirror(): Entity {
    const mirror = engine.addEntity()
    NetworkEntity.create(mirror, { networkId: 999, entityId: 600 as Entity })
    SyncComponents.create(mirror, { componentIds: [Transform.componentId] })
    return mirror
  }

  return { engine, sent, network, sentComponentIds, createMirror, Transform, GltfContainer, VisibilityComponent }
}

describe('sync filter', () => {
  it('should not forward the first write of an unlisted component on a mirror entity', async () => {
    const { engine, sent, sentComponentIds, createMirror, VisibilityComponent } = setup()
    const mirror = createMirror()
    await engine.update(1)
    sent.length = 0

    VisibilityComponent.create(mirror, { visible: false })
    await engine.update(1)

    expect(sentComponentIds(600)).not.toContain(VisibilityComponent.componentId)
  })

  it('should forward a listed component written on a mirror entity', async () => {
    const { engine, sent, sentComponentIds, createMirror, Transform } = setup()
    const mirror = createMirror()
    await engine.update(1)
    sent.length = 0

    Transform.create(mirror, { position: { x: 1, y: 0, z: 0 } })
    await engine.update(1)

    expect(sentComponentIds(600)).toContain(Transform.componentId)
  })

  it('should forward every component written by the creator in the creation tick', async () => {
    const { engine, network, sentComponentIds, Transform, GltfContainer } = setup()
    await engine.update(1)

    const entity = engine.addEntity()
    network.syncEntity(entity, [Transform.componentId])
    Transform.create(entity)
    GltfContainer.create(entity, { src: 'cube.glb' })
    await engine.update(1)

    expect(sentComponentIds(entity)).toEqual(expect.arrayContaining([Transform.componentId, GltfContainer.componentId]))
  })

  it('should not forward an unlisted component the creator adds after the creation tick', async () => {
    const { engine, sent, network, sentComponentIds, Transform, VisibilityComponent } = setup()
    await engine.update(1)

    const entity = engine.addEntity()
    network.syncEntity(entity, [Transform.componentId])
    Transform.create(entity)
    await engine.update(1)
    sent.length = 0

    VisibilityComponent.create(entity, { visible: false })
    await engine.update(1)

    expect(sentComponentIds(entity)).not.toContain(VisibilityComponent.componentId)
  })

  it('should forward the creation tick of an entity synced while an earlier transport is flushing', async () => {
    let spawn = () => {}
    const { engine, network, sentComponentIds, Transform, GltfContainer } = setup(() => spawn())
    await engine.update(1)

    const entity = engine.addEntity()
    spawn = () => {
      spawn = () => {}
      network.syncEntity(entity, [Transform.componentId])
      Transform.create(entity)
      GltfContainer.create(entity, { src: 'cube.glb' })
    }
    await engine.update(1)
    await engine.update(1)

    expect(sentComponentIds(entity)).toContain(GltfContainer.componentId)
  })
})
