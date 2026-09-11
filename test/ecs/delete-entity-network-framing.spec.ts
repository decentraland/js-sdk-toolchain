import { Entity } from '../../packages/@dcl/ecs/src/engine'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'
import { CrdtMessageProtocol } from '../../packages/@dcl/ecs/src/serialization/crdt'
import { DeleteEntity } from '../../packages/@dcl/ecs/src/serialization/crdt/deleteEntity'
import { DeleteEntityNetwork } from '../../packages/@dcl/ecs/src/serialization/crdt/network/deleteEntityNetwork'
import { CrdtMessageType } from '../../packages/@dcl/ecs/src/serialization/crdt/types'

const ENTITY = 512 as Entity
const NETWORK_ID = 7

describe('when a network entity delete is written', () => {
  let buffer: ReadWriteByteBuffer
  let bytesWritten: number

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer()
    DeleteEntityNetwork.write(ENTITY, NETWORK_ID, buffer)
    bytesWritten = buffer.currentWriteOffset()
  })

  it('should declare the length it actually wrote', () => {
    expect(CrdtMessageProtocol.getHeader(buffer)?.length).toBe(bytesWritten)
  })

  it('should let a reader that skips by the declared length land on the next message', () => {
    DeleteEntityNetwork.write(ENTITY, NETWORK_ID, buffer)
    CrdtMessageProtocol.consumeMessage(buffer)

    expect(CrdtMessageProtocol.getHeader(buffer)?.type).toBe(CrdtMessageType.DELETE_ENTITY_NETWORK)
  })

  it('should still read its own fields back', () => {
    const message = DeleteEntityNetwork.read(buffer)

    expect(message).toMatchObject({ entityId: ENTITY, networkId: NETWORK_ID })
  })
})

describe('when there is no message left to read', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer()
  })

  it('should return nothing rather than read past the end', () => {
    expect(DeleteEntityNetwork.read(buffer)).toBeNull()
  })
})

describe('when the next message is of another type', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer()
    DeleteEntity.write(ENTITY, buffer)
  })

  it('should refuse to read it as a network delete', () => {
    expect(() => DeleteEntityNetwork.read(buffer)).toThrow('tried to read another message type')
  })
})
