import { readMessage } from '../../../packages/@dcl/ecs/src/serialization/crdt/message'
import { ReadWriteByteBuffer } from '../../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import {
  PutNetworkComponentOperation,
  DeleteEntityNetwork,
  DeleteComponentNetwork,
  CrdtMessageType
} from '../../../packages/@dcl/ecs/src'
import { Entity } from '../../../packages/@dcl/ecs/dist'

describe('Network messages', () => {
  const buffer = new ReadWriteByteBuffer()

  it('should serialize put component network message', () => {
    PutNetworkComponentOperation.write(1 as Entity, 2, 3, 4, Uint8Array.of(1), buffer)
    const message = buffer.toCopiedBinary()
    const networkMessage = readMessage(buffer)!
    expect(networkMessage).toMatchObject({
      entityId: 1,
      timestamp: 2,
      componentId: 3,
      networkId: 4,
      data: Uint8Array.of(1),
      type: CrdtMessageType.PUT_COMPONENT_NETWORK
    })
    buffer.resetBuffer()
    buffer.writeBuffer(message, false)
    expect(PutNetworkComponentOperation.read(buffer)!.length).toBe(29)
    buffer.resetBuffer()
    buffer.writeBuffer(message, false)
    expect(() => DeleteComponentNetwork.read(buffer)).toThrowError()
    buffer.resetBuffer()
    buffer.writeBuffer(message, false)
    expect(() => DeleteEntityNetwork.read(buffer)).toThrowError()
  })

  it('should serialize delete component network message', () => {
    buffer.resetBuffer()
    DeleteComponentNetwork.write(1 as Entity, 2, 3, 4, buffer)
    const message = buffer.toCopiedBinary()
    const networkMessage = readMessage(buffer)!
    expect(networkMessage).toMatchObject({
      entityId: 1,
      componentId: 2,
      timestamp: 3,
      networkId: 4,
      type: CrdtMessageType.DELETE_COMPONENT_NETWORK
    })
    buffer.resetBuffer()
    buffer.writeBuffer(message, false)
    expect(() => PutNetworkComponentOperation.read(buffer)).toThrowError()
    buffer.resetBuffer()
    buffer.writeBuffer(message, false)
    expect(() => DeleteEntityNetwork.read(buffer)).toThrowError()
    buffer.resetBuffer()
    buffer.writeBuffer(message, false)
    expect(DeleteComponentNetwork.read(buffer)).toBeDefined()
  })

  it('should serialize delete entity network message', () => {
    buffer.resetBuffer()
    DeleteEntityNetwork.write(1 as Entity, 2, buffer)
    const message = buffer.toCopiedBinary()
    const networkMessage = readMessage(buffer)!
    expect(networkMessage).toMatchObject({
      entityId: 1,
      networkId: 2,
      type: CrdtMessageType.DELETE_ENTITY_NETWORK
    })
    buffer.resetBuffer()
    buffer.writeBuffer(message, false)
    expect(() => PutNetworkComponentOperation.read(buffer)).toThrowError()
    buffer.resetBuffer()
    buffer.writeBuffer(message, false)
    expect(() => DeleteComponentNetwork.read(buffer)).toThrowError()
    buffer.resetBuffer()
    buffer.writeBuffer(message, false)
    expect(DeleteEntityNetwork.read(buffer)).toBeDefined()
  })

  it('should return null with invalid message', () => {
    buffer.resetBuffer()
    expect(DeleteEntityNetwork.read(buffer)).toBe(null)
    expect(DeleteComponentNetwork.read(buffer)).toBe(null)
    expect(PutNetworkComponentOperation.read(buffer)).toBe(null)
  })
})
