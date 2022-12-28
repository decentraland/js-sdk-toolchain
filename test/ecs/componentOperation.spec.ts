import { TRANSFORM_LENGTH } from '../../packages/@dcl/ecs/src/components/legacy/Transform'
import { Engine, Entity } from '../../packages/@dcl/ecs/src/engine'
import * as components from '../../packages/@dcl/ecs/src/components'
import { Quaternion, Vector3 } from '../../packages/@dcl/sdk/src/math'

import { createByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { WireMessageEnum, WIRE_MESSAGE_HEADER_LENGTH } from '../../packages/@dcl/ecs/src/serialization/types'

import { WireMessage } from '../../packages/@dcl/ecs/src/serialization/wireMessage'
import { ComponentOperation } from '../../packages/@dcl/ecs/src/serialization/messages/componentOperation'

const putType = WireMessageEnum.PUT_COMPONENT

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
    const Transform = components.Transform(newEngine)
    const entityA = newEngine.addEntity()
    const entityB = newEngine.addEntity()

    let timestamp = 1

    const mutableTransform = Transform.create(entityA, {
      position: Vector3.create(1, 1, 1),
      scale: Vector3.create(1, 1, 1),
      rotation: Quaternion.create(1, 1, 1, 1),
      parent: 0 as Entity
    })

    const bb = createByteBuffer()

    ComponentOperation.write(
      WireMessageEnum.PUT_COMPONENT,
      entityA,
      timestamp,
      Transform,
      bb
    )

    mutableTransform.position.x = 31.3
    timestamp++

    ComponentOperation.write(putType, entityA, timestamp, Transform, bb)

    while (WireMessage.validate(bb)) {
      const msgOne = ComponentOperation.read(bb)!
      expect(msgOne.length).toBe(
        TRANSFORM_LENGTH +
        ComponentOperation.MESSAGE_HEADER_LENGTH +
        WIRE_MESSAGE_HEADER_LENGTH
      )
      expect(msgOne.type).toBe(WireMessageEnum.PUT_COMPONENT)
      Transform.upsertFromBinary(entityB, bb)
    }
  })

  it('should return null if it has an invalid header', () => {
    const buf = createByteBuffer()
    expect(ComponentOperation.read(buf)).toBe(null)
  })
})
