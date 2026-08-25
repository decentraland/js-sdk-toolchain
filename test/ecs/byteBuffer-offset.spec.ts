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

  describe('when a raw proxy write targets an offset outside a sliced buffer', () => {
    let backingBuffer: Uint8Array
    let neighbourOffset: number
    let outOfRangeOffset: number
    let slicedBuffer: Uint8Array
    let thrown: Error | undefined

    beforeEach(() => {
      backingBuffer = new Uint8Array(64)
      neighbourOffset = 32
      // A byte belonging to whatever else shares the backing buffer.
      backingBuffer[neighbourOffset] = 0xaa
      slicedBuffer = backingBuffer.subarray(8, 16)
      outOfRangeOffset = neighbourOffset - slicedBuffer.byteOffset
      thrown = undefined

      const buffer = new ReadWriteByteBuffer(slicedBuffer, 0, 0)

      try {
        buffer.setUint32(outOfRangeOffset, 0xdeadbeef)
      } catch (error) {
        thrown = error as Error
      }
    })

    it('should throw a RangeError instead of writing out of bounds', () => {
      expect(thrown).toBeInstanceOf(RangeError)
    })

    it('should leave the byte outside the slice untouched', () => {
      expect(backingBuffer[neighbourOffset]).toBe(0xaa)
    })
  })
})
