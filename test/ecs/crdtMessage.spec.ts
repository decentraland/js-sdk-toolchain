import * as components from '../../packages/@dcl/ecs/src/components'
import { TRANSFORM_LENGTH } from '../../packages/@dcl/ecs/src/components/legacy/Transform'
import { Engine, Entity } from '../../packages/@dcl/ecs/src/engine'
import { Quaternion, Vector3 } from '../../packages/@dcl/sdk/src/math'

import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { CrdtMessageType, CRDT_MESSAGE_HEADER_LENGTH } from '../../packages/@dcl/ecs/src/serialization/crdt/types'

import {
  CrdtMessageProtocol,
  DeleteComponent,
  PutComponentOperation
} from '../../packages/@dcl/ecs/src/serialization/crdt'
import { DeleteEntity } from '../../packages/@dcl/ecs/src/serialization/crdt/deleteEntity'
import { readMessage } from '../../packages/@dcl/ecs/src/serialization/crdt/message'

describe('Component operation tests', () => {
  it('validate corrupt message', () => {
    const buf = new ReadWriteByteBuffer(
      new Uint8Array([255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255]),
      0
    )

    expect(CrdtMessageProtocol.validate(buf)).toBe(false)
    expect(DeleteComponent.read(buf)).toBe(null)
    expect(PutComponentOperation.read(buf)).toBe(null)
    expect(DeleteEntity.read(buf)).toBe(null)
    expect(CrdtMessageProtocol.consumeMessage(buf)).toBe(false)
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

    const bb = new ReadWriteByteBuffer()

    PutComponentOperation.write(entityA, timestamp, Transform, bb)

    mutableTransform.position.x = 31.3
    timestamp++

    PutComponentOperation.write(entityA, timestamp, Transform, bb)

    while (CrdtMessageProtocol.validate(bb)) {
      const msgOne = readMessage(bb)!
      expect(msgOne.length).toBe(
        TRANSFORM_LENGTH + PutComponentOperation.MESSAGE_HEADER_LENGTH + CRDT_MESSAGE_HEADER_LENGTH
      )
      expect(msgOne.type).toBe(CrdtMessageType.PUT_COMPONENT)
      Transform.upsertFromBinary(entityB, bb)
    }
  })

  it('should return null if it has an invalid header', () => {
    const buf = new ReadWriteByteBuffer()
    expect(readMessage(buf)).toBe(null)
    expect(DeleteEntity.read(buf)).toBe(null)

    buf.writeUint32(4567)
    buf.writeUint32(1)
    expect(CrdtMessageProtocol.getHeader(buf)).toBe(null)
  })

  it('should fail null if it has an invalid type', () => {
    const buf = new ReadWriteByteBuffer()

    function writeSomeInvalidMessage() {
      buf.writeUint32(8)
      buf.writeUint32(213)
    }

    writeSomeInvalidMessage()
    expect(() => {
      PutComponentOperation.read(buf)
    }).toThrowError()

    writeSomeInvalidMessage()
    expect(() => {
      DeleteEntity.read(buf)
    }).toThrowError()

    writeSomeInvalidMessage()
    expect(() => {
      DeleteComponent.read(buf)
    }).toThrowError()

    writeSomeInvalidMessage()
    expect(() => {
      DeleteComponent.read(buf)
    }).toThrowError()

    writeSomeInvalidMessage()
    expect(readMessage(buf)).toBeNull()

    // the header has to be read
    expect(CrdtMessageProtocol.readHeader(buf)).not.toBeNull()

    buf.writeUint32(12)
    buf.writeUint32(213)
    buf.writeUint32(22)
    expect(buf.remainingBytes()).toBe(12)
    expect(CrdtMessageProtocol.consumeMessage(buf)).toBe(true)
    expect(buf.remainingBytes()).toBe(0)
  })
})
