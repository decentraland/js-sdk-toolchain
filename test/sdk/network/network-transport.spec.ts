import {
  Engine,
  IEngine,
  Transform,
  NetworkEntity,
  NetworkParent,
  SyncComponents,
  EngineInfo,
  GltfContainer,
  CrdtMessage
} from '../../../packages/@dcl/ecs'
import * as components from '../../../packages/@dcl/ecs/src/components'
import { addSyncTransport } from '../../../packages/@dcl/sdk/network/message-bus-sync'
import { CommsMessage, encodeString } from '../../../packages/@dcl/sdk/network/binary-message-bus'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { readMessage } from '../../../packages/@dcl/ecs/src/serialization/crdt/message'

import { SendBinaryRequest, SendBinaryResponse } from '~system/CommunicationsController'

function defineComponents(engine: IEngine) {
  return {
    Transform: components.Transform(engine as any) as any as typeof Transform,
    NetworkEntity: components.NetworkEntity(engine as any) as any as typeof NetworkEntity,
    NetworkParent: components.NetworkParent(engine as any) as any as typeof NetworkParent,
    SyncComponents: components.SyncComponents(engine as any) as any as typeof SyncComponents,
    EngineInfo: components.EngineInfo(engine as any) as any as typeof EngineInfo,
    GltfContainer: components.GltfContainer(engine as any) as any as typeof GltfContainer
  }
}

describe('Network Parenting', () => {
  const engineA = Engine()
  const interceptedMessages: any[] = []

  function intercept(data: Uint8Array, direction: string) {
    const buffer = new ReadWriteByteBuffer(data, 0)

    let msg: CrdtMessage | null
    while ((msg = readMessage(buffer))) {
      interceptedMessages.push({
        ...msg,
        direction
      })
    }
  }

  const Components = defineComponents(engineA)

  // Network Transports
  const networkmessages: Uint8Array[] = []

  const sendBinaryA: (msg: SendBinaryRequest) => Promise<SendBinaryResponse> = async (msg) => {
    for (const value of msg.peerData) {
      for (const data of value.data) {
        networkmessages.push(data)
        const messageType = data.subarray(0, 1)[0]
        if (messageType === CommsMessage.CRDT) {
          const crdtMessage = data.subarray(1)
          intercept(crdtMessage, 'a->b')
        }
      }
    }
    const messages = networkmessages.map(($) => {
      const senderBytes = encodeString('B')
      const serializedMessage = new Uint8Array($.byteLength + senderBytes.byteLength + 1)
      serializedMessage.set(new Uint8Array([senderBytes.byteLength]), 0)
      serializedMessage.set(senderBytes, 1)
      serializedMessage.set($, senderBytes.byteLength + 1)
      return serializedMessage
    })
    return { data: messages }
  }

  const NetworkUtils = addSyncTransport(engineA, sendBinaryA, async () => ({
    data: { userId: 'A', version: 1, displayName: '1', hasConnectedWeb3: true, avatar: undefined }
  }))

  const Cube = engineA.defineComponent('cube', {})
  const CUBES_LENGTH = 320
  afterEach(() => {
    interceptedMessages.length = 0
    networkmessages.length = 0
  })

  it('should create the cubes', async () => {
    for (const _ of Array.from({ length: CUBES_LENGTH })) {
      const entity = engineA.addEntity()
      Components.Transform.create(entity, {})
      Cube.create(entity, {})
      NetworkUtils.syncEntity(entity, [Transform.componentId])
    }
    await engineA.update(1)
  })
  it('should mutate and send new state for each cube', async () => {
    for (const [entity] of engineA.getEntitiesWith(Cube)) {
      Components.Transform.getMutable(entity).position.x += 1
    }
    await engineA.update(1)
    expect(Math.round(networkmessages[0].byteLength / 1024)).toBe(13)
    expect(interceptedMessages.length).toBe(CUBES_LENGTH)
    expect(networkmessages.length).toBe(2)
  })
})
