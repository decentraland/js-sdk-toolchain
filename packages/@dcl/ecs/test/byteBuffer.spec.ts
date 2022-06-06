import { createByteBuffer } from '../src/serialization/ByteBuffer'

describe('ByteBuffer tests', () => {
  it('test all types', () => {
    const buf = createByteBuffer()

    buf.writeInt8(0xff)
    buf.writeInt16(0xffff)
    buf.writeInt32(0xffffffff)
    buf.writeInt64(0xffffffffffffffffn)
    buf.writeUint8(0xff)
    buf.writeUint16(0xffff)
    buf.writeUint32(0xffffffff)
    buf.writeUint64(0xffffffffffffffffn)
    buf.writeFloat32(Math.PI)
    buf.writeFloat64(Math.PI)
    buf.writeBuffer(new Uint8Array([27, 43, 97, 31]))

    expect(buf.size()).toBe(50)

    expect(buf.readInt8()).toBe(-1)
    expect(buf.readInt16()).toBe(-1)
    expect(buf.readInt32()).toBe(-1)
    expect(buf.readInt64()).toBe(-1n)

    expect(buf.remainingBytes()).toBe(50 - 15)
    expect(buf.currentReadOffset()).toBe(15)

    expect(buf.readUint8()).toBe(255)
    expect(buf.readUint16()).toBe(65535)
    expect(buf.readUint32()).toBe(4294967295)
    expect(buf.readUint64()).toBe(18446744073709551615n)
    expect(buf.readFloat32()).toBeCloseTo(Math.PI)
    expect(buf.readFloat64()).toBe(Math.PI)
    expect(buf.readBuffer().toString()).toEqual([27, 43, 97, 31].toString())
  })

  it('should test bounds conditions', () => {
    const buf = createByteBuffer({
      reading: {
        buffer: new Uint8Array([1, 2]),
        currentOffset: 2
      }
    })

    expect(() => {
      buf.readInt8()
    }).toThrowError('Outside of the bounds of writen data.')

    expect(buf.size()).toBe(2)
    buf.writeInt8(100)

    expect(buf.size()).toBeGreaterThan(2)
    expect(buf.bufferLength()).toBeGreaterThan(20)

    expect(buf.readUint8()).toBe(100)
  })

  it('should write options and endianess', () => {
    const buf = createByteBuffer({
      writing: {
        buffer: new Uint8Array([0, 200, 0, 200]),
        currentOffset: 2
      }
    })

    expect(buf.size()).toBe(2)

    buf.writeUint16(0xffff)

    expect(buf.size()).toBe(4)
    expect(buf.bufferLength()).toBe(4)
    expect(buf.toBinary().toString()).toBe([0, 200, 255, 255].toString())
  })

  it('should not fail using the view wrapper after a grow', () => {
    const buf = createByteBuffer({
      writing: {
        buffer: new Uint8Array([0, 200, 0, 200]),
        currentOffset: 2
      }
    })

    expect(buf.buffer().byteLength).toBe(4)

    buf.writeUint32(0xfade)

    expect(buf.buffer().byteLength).toBeGreaterThan(4)
    expect(buf.getUint32(2)).toBe(0xfade)
  })

  it('should create a buffer with subArray offset', () => {
    const arr = new Uint8Array(1024)
    arr[1] = 0xfa
    arr[3] = 0xde

    const buf = createByteBuffer({
      writing: {
        buffer: arr.subarray(512),
        currentOffset: 0
      }
    })
    expect(buf.getUint32(0)).toBe(0)
  })

  it('should fails using the view after a grow', () => {
    const buf = createByteBuffer({
      writing: {
        buffer: new Uint8Array([0, 200, 0, 200]),
        currentOffset: 2
      }
    })

    expect(buf.buffer().byteLength).toBe(4)

    buf.writeUint32(0xfade)

    expect(buf.buffer().byteLength).toBeGreaterThan(4)
  })

  it('should test increment offset and types with custom offset', () => {
    const position = createByteBuffer()
    const writeOffset = position.incrementWriteOffset(12)
    expect(writeOffset).toBe(0)

    position.setUint32(writeOffset, 1)
    position.setFloat32(writeOffset + 4, 2)
    position.setFloat64(writeOffset + 8, 3)
    position.setInt8(writeOffset + 16, 4)
    position.setInt16(writeOffset + 17, 5)
    position.setInt32(writeOffset + 19, 6)
    position.setUint8(writeOffset + 23, 7)
    position.setUint16(writeOffset + 24, 8)
    position.setInt64(writeOffset + 26, 0xffffffffffffffffn)
    position.setUint64(writeOffset + 34, 0xffffffffffffffffn)
    expect(position.currentReadOffset()).toBe(0)

    const readOffset = position.incrementReadOffset(12)
    expect(readOffset).toBe(0)
    expect(position.getUint32(readOffset)).toBe(1)
    expect(position.getFloat32(readOffset + 4)).toBe(2)
    expect(position.getFloat64(readOffset + 8)).toBe(3)
    expect(position.getInt8(readOffset + 16)).toBe(4)
    expect(position.getInt16(readOffset + 17)).toBe(5)
    expect(position.getInt32(readOffset + 19)).toBe(6)
    expect(position.getUint8(readOffset + 23)).toBe(7)
    expect(position.getUint16(readOffset + 24)).toBe(8)
    expect(position.getInt64(readOffset + 26)).toBe(-1n)
    expect(position.getUint64(readOffset + 34)).toBe(18446744073709551615n)
    expect(position.currentReadOffset()).toBe(12)
  })
})
// getInt64
