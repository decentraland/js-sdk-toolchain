import * as components from '../../packages/@dcl/ecs/src/components'
import { TRANSFORM_LENGTH } from '../../packages/@dcl/ecs/src/components/manual/Transform'
import { Engine, Entity } from '../../packages/@dcl/ecs/src/engine'
import { Quaternion, Vector3 } from '../../packages/@dcl/sdk/src/math'

import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import {
  CrdtMessageType,
  CRDT_MESSAGE_HEADER_LENGTH,
  PutComponentMessageBody
} from '../../packages/@dcl/ecs/src/serialization/crdt/types'

import {
  CrdtMessageProtocol,
  DeleteComponent,
  PutComponentOperation,
  AppendValueOperation
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

    Transform.create(entityA, {
      position: Vector3.create(1, 1, 1),
      scale: Vector3.create(1, 1, 1),
      rotation: Quaternion.create(1, 1, 1, 1),
      parent: 0 as Entity
    })

    const bb = new ReadWriteByteBuffer()

    // Avoid creating messages if there is no transport that will handle it
    const [message] = Transform.getCrdtUpdates() as [PutComponentMessageBody]
    PutComponentOperation.write(message.entityId, message.timestamp, message.componentId, (message as any).data, bb)

    Transform.getMutable(entityA).position.x = 31.3

    PutComponentOperation.write(message.entityId, message.timestamp, message.componentId, (message as any).data, bb)

    while (CrdtMessageProtocol.validate(bb)) {
      const msgOne = readMessage(bb)!
      expect(msgOne.length).toBe(
        TRANSFORM_LENGTH + PutComponentOperation.MESSAGE_HEADER_LENGTH + CRDT_MESSAGE_HEADER_LENGTH
      )
      expect(msgOne.type).toBe(CrdtMessageType.PUT_COMPONENT)
      Transform.updateFromCrdt(msgOne)
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

  it('appendValue works', () => {
    const buf = new ReadWriteByteBuffer()
    AppendValueOperation.write(1 as Entity, 0, 1, Uint8Array.of(1, 2, 3), buf)
    const msg = readMessage(buf)

    expect(msg).toEqual({
      componentId: 1,
      data: Uint8Array.of(1, 2, 3),
      entityId: 1,
      length: 27,
      timestamp: 0,
      type: 4
    })
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
