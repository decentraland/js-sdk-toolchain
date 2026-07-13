import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'

describe('when a ByteBuffer exceeds its current capacity', () => {
  let buffer: ReadWriteByteBuffer
  let initialCapacity: number

  beforeEach(() => {
    buffer = new ReadWriteByteBuffer()
    initialCapacity = buffer.bufferLength()
  })

  it('should double its capacity to reduce repeated reallocations', () => {
    buffer.incrementWriteOffset(initialCapacity + 1)

    expect(buffer.bufferLength()).toBe(initialCapacity * 2)
  })
})
