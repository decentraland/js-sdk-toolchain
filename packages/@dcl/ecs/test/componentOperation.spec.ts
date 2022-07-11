import { Quaternion, Vector3 } from '@dcl/ecs-math'
import { TRANSFORM_LENGTH } from '../src/components/legacy/Transform'
import { Engine } from '../src/engine'
import { Entity } from '../src/engine/entity'
import { createByteBuffer } from '../src/serialization/ByteBuffer'
import { ComponentOperation } from '../src/serialization/crdt/componentOperation'
import WireMessage from '../src/serialization/wireMessage'

const putType = WireMessage.Enum.PUT_COMPONENT

describe('Component operation tests', () => {
  it('validate corrupt message', () => {
    const buf = createByteBuffer({
      reading: {
        buffer: new Uint8Array([
          255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255
        ]),
        currentOffset: 0
      }
    })

    expect(WireMessage.validate(buf)).toBe(false)
  })

  it('serialize and process two PutComenentOperation message', () => {
    const newEngine = Engine()
    const sdk = newEngine.baseComponents
    const entityA = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    let timestamp = 1

    const mutableTransform = sdk.Transform.create(entityA, {
      position: Vector3.create(1, 1, 1),
      scale: Vector3.create(1, 1, 1),
      rotation: Quaternion.create(1, 1, 1, 1),
      parent: 0 as Entity
    })

    const bb = createByteBuffer()

    ComponentOperation.write(
      WireMessage.Enum.PUT_COMPONENT,
      entityA,
      timestamp,
      sdk.Transform,
      bb
    )

    mutableTransform.position.x = 31.3
    timestamp++

    ComponentOperation.write(putType, entityA, timestamp, sdk.Transform, bb)

    while (WireMessage.validate(bb)) {
      const msgOne = ComponentOperation.read(bb)!
      expect(msgOne.length).toBe(
        TRANSFORM_LENGTH +
          ComponentOperation.MESSAGE_HEADER_LENGTH +
          WireMessage.HEADER_LENGTH
      )
      expect(msgOne.type).toBe(WireMessage.Enum.PUT_COMPONENT)
      sdk.Transform.upsertFromBinary(entityB, bb)
    }
  })

  it('should return null if it has an invalid header', () => {
    const buf = createByteBuffer()
    expect(ComponentOperation.read(buf)).toBe(null)
  })
})
