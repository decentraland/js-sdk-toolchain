import { Entity, EntityUtils, Schemas } from '../../packages/@dcl/ecs/src'
import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'

/** An id whose version has pushed it past the signed 32-bit range. */
const HIGH_VERSION_ENTITY = EntityUtils.toEntityId(512, 0x8000) as Entity
const ORDINARY_ENTITY = EntityUtils.toEntityId(512, 0) as Entity

describe('when an entity id whose version passed the signed range is serialized', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer()
    Schemas.Entity.serialize(HIGH_VERSION_ENTITY, buffer)
  })

  it('should read back as the same id', () => {
    expect(Schemas.Entity.deserialize(buffer)).toBe(HIGH_VERSION_ENTITY)
  })

  it('should read back as a positive number', () => {
    expect(Schemas.Entity.deserialize(buffer)).toBeGreaterThan(0)
  })

  it('should occupy the four bytes it always did', () => {
    expect(buffer.currentWriteOffset()).toBe(4)
  })
})

describe('when an ordinary entity id is serialized', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer()
    Schemas.Entity.serialize(ORDINARY_ENTITY, buffer)
  })

  it('should read back as the same id', () => {
    expect(Schemas.Entity.deserialize(buffer)).toBe(ORDINARY_ENTITY)
  })
})

describe('when reading bytes written the old way, as a signed int', () => {
  let buffer: ReadWriteByteBuffer

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer()
    buffer.writeInt32(HIGH_VERSION_ENTITY as number)
  })

  it('should still read back as the id that was written', () => {
    expect(Schemas.Entity.deserialize(buffer)).toBe(HIGH_VERSION_ENTITY)
  })
})
