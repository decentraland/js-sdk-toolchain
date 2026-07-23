import { ReadWriteByteBuffer } from '../../packages/@dcl/ecs/src/serialization/ByteBuffer'

describe('ReadWriteByteBuffer', () => {
  describe('when a sliced input buffer grows', () => {
    let buffer: ReadWriteByteBuffer
    let backingBuffer: Uint8Array
    let slicedBuffer: Uint8Array

    beforeEach(() => {
      backingBuffer = new Uint8Array(20)
      slicedBuffer = backingBuffer.subarray(5, 10)
      buffer = new ReadWriteByteBuffer(slicedBuffer, 0, slicedBuffer.length)
    })

    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('should write subsequent values at their logical offset', () => {
      buffer.writeBuffer(new Uint8Array(1025), false)
      buffer.writeUint8(123)

      expect(buffer.toBinary()[buffer.currentWriteOffset() - 1]).toBe(123)
    })
  })
})
