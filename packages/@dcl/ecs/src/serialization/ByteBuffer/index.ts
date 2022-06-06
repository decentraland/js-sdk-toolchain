/**
 * Take the max between currentSize and intendedSize and then plus 1024. Then,
 *  find the next nearer multiple of 1024.
 * @param currentSize - number
 * @param intendedSize - number
 * @returns the calculated number
 */
function getNextSize(currentSize: number, intendedSize: number) {
  const minNewSize = Math.max(currentSize, intendedSize) + 1024
  return Math.ceil(minNewSize / 1024) * 1024
}

/**
 * @param writing - writing option, see object specs.
 * @param reading - reading option, see object specs.
 * @param initialCapacity - Initial capacity of buffer to allocate, ignored if you use writing or reading options
 */
export interface CreateByteBufferOptions {
  /**
   * @param buffer - a buffer already allocated to read from there.
   * @param currentOffset - set the cursor where begins to read. Default 0
   * @param length - delimite where the valid data ends. Default: buffer.length
   */
  reading?: {
    buffer: Uint8Array
    length?: number
    currentOffset: number
  }

  /**
   * @param buffer - a buffer already allocated to write there.
   * @param currentOffset - set the cursor to not start writing from the begin of it. Default 0
   */
  writing?: {
    buffer: Uint8Array
    currentOffset?: number
  }

  initialCapacity?: number
}

const defaultInitialCapacity = 10240

/**
 * ByteBuffer is a wrapper of DataView which also adds a read and write offset.
 *  Also in a write operation it resizes the buffer is being used if it needs.
 *
 * - Use read and write function to generate or consume data.
 * - Use set and get only if you are sure that you're doing.
 */
export function createByteBuffer(options: CreateByteBufferOptions = {}) {
  const initialROffset: number = options.reading?.currentOffset || 0
  let initialBuffer: Uint8Array | null = null
  let initialWOffset: number = 0

  if (options.writing) {
    initialBuffer = options.writing.buffer
    if (options.writing.currentOffset) {
      initialWOffset = options.writing.currentOffset
    }
  } else if (options.reading) {
    initialBuffer = options.reading.buffer
    initialWOffset = options.reading.length || options.reading.buffer.length
  } else {
    initialBuffer = new Uint8Array(
      options.initialCapacity || defaultInitialCapacity
    )
  }

  let buffer: Uint8Array = initialBuffer!
  let view: DataView = new DataView(buffer.buffer, buffer.byteOffset)
  let woffset: number = initialWOffset
  let roffset: number = initialROffset

  /**
   * Increement the write offset and resize the buffer if it needs.
   */
  const woAdd = (amount: number) => {
    if (woffset + amount > buffer.byteLength) {
      const newsize = getNextSize(buffer.byteLength, woffset + amount)
      const newBuffer = new Uint8Array(newsize)
      newBuffer.set(buffer)
      buffer = newBuffer
      view = new DataView(buffer.buffer)
    }

    woffset += amount
    return woffset - amount
  }

  /**
   * Increment the read offset and throw an error if it's trying to read
   *  outside the bounds.
   */
  const roAdd = (amount: number) => {
    if (roffset + amount > woffset) {
      throw new Error('Outside of the bounds of writen data.')
    }

    roffset += amount
    return roffset - amount
  }

  return {
    /**
     * @returns The entire current Uint8Array.
     *
     * WARNING: if the buffer grows, the view had changed itself,
     *  and the reference will be a invalid one.
     */
    buffer(): Uint8Array {
      return buffer
    },
    /**
     * @returns The capacity of the current buffer
     */
    bufferLength(): number {
      return buffer.length
    },
    /**
     * Resets byteBuffer to avoid creating a new one
     */
    resetBuffer(): void {
      roffset = 0
      woffset = 0
    },
    /**
     * @returns The current read offset
     */
    currentReadOffset(): number {
      return roffset
    },
    /**
     * @returns The current write offset
     */
    currentWriteOffset(): number {
      return woffset
    },
    /**
     * Reading purpose
     * Returns the previuos offsset size before incrementing
     */
    incrementReadOffset(amount: number): number {
      return roAdd(amount)
    },
    /**
     * @returns How many bytes are available to read.
     */
    remainingBytes(): number {
      return woffset - roffset
    },
    readFloat32(): number {
      return view.getFloat32(roAdd(4))
    },
    readFloat64(): number {
      return view.getFloat64(roAdd(8))
    },
    readInt8(): number {
      return view.getInt8(roAdd(1))
    },
    readInt16(): number {
      return view.getInt16(roAdd(2))
    },
    readInt32(): number {
      return view.getInt32(roAdd(4))
    },
    readInt64(): bigint {
      return view.getBigInt64(roAdd(8))
    },
    readUint8(): number {
      return view.getUint8(roAdd(1))
    },
    readUint16(): number {
      return view.getUint16(roAdd(2))
    },
    readUint32(): number {
      return view.getUint32(roAdd(4))
    },
    readUint64(): bigint {
      return view.getBigUint64(roAdd(8))
    },
    readBuffer() {
      const length = view.getUint32(roAdd(4))
      return buffer.subarray(roAdd(length), roAdd(0))
    },
    /**
     * Writing purpose
     */
    /**
     * Increment offset
     * @param amount - how many bytes
     * @returns The offset when this reserving starts.
     */
    incrementWriteOffset(amount: number): number {
      return woAdd(amount)
    },
    /**
     * @returns The total number of bytes writen in the buffer.
     */
    size(): number {
      return woffset
    },
    /**
     * @returns The subarray from 0 to offset.
     */
    toBinary() {
      return buffer.subarray(0, woffset)
    },
    writeBuffer(value: Uint8Array, writeLength: boolean = true) {
      if (writeLength) {
        this.writeUint32(value.byteLength)
      }

      // TODO: lean
      const o = woAdd(value.byteLength)
      buffer.set(value, o)
    },
    writeFloat32(value: number): void {
      const o = woAdd(4)
      view.setFloat32(o, value)
    },
    writeFloat64(value: number): void {
      const o = woAdd(8)
      view.setFloat64(o, value)
    },
    writeInt8(value: number): void {
      const o = woAdd(1)
      view.setInt8(o, value)
    },
    writeInt16(value: number): void {
      const o = woAdd(2)
      view.setInt16(o, value)
    },
    writeInt32(value: number): void {
      const o = woAdd(4)
      view.setInt32(o, value)
    },
    writeInt64(value: bigint): void {
      const o = woAdd(8)
      view.setBigInt64(o, value)
    },
    writeUint8(value: number): void {
      const o = woAdd(1)
      view.setUint8(o, value)
    },
    writeUint16(value: number): void {
      const o = woAdd(2)
      view.setUint16(o, value)
    },
    writeUint32(value: number): void {
      const o = woAdd(4)
      view.setUint32(o, value)
    },
    writeUint64(value: bigint): void {
      const o = woAdd(8)
      view.setBigUint64(o, value)
    },
    // Dataview Proxy
    getFloat32(offset: number): number {
      return view.getFloat32(offset)
    },
    getFloat64(offset: number): number {
      return view.getFloat64(offset)
    },
    getInt8(offset: number): number {
      return view.getInt8(offset)
    },
    getInt16(offset: number): number {
      return view.getInt16(offset)
    },
    getInt32(offset: number): number {
      return view.getInt32(offset)
    },
    getInt64(offset: number): bigint {
      return view.getBigInt64(offset)
    },
    getUint8(offset: number): number {
      return view.getUint8(offset)
    },
    getUint16(offset: number): number {
      return view.getUint16(offset)
    },
    getUint32(offset: number): number {
      return view.getUint32(offset)
    },
    getUint64(offset: number): bigint {
      return view.getBigUint64(offset)
    },
    setFloat32(offset: number, value: number): void {
      view.setFloat32(offset, value)
    },
    setFloat64(offset: number, value: number): void {
      view.setFloat64(offset, value)
    },
    setInt8(offset: number, value: number): void {
      view.setInt8(offset, value)
    },
    setInt16(offset: number, value: number): void {
      view.setInt16(offset, value)
    },
    setInt32(offset: number, value: number): void {
      view.setInt32(offset, value)
    },
    setInt64(offset: number, value: bigint): void {
      view.setBigInt64(offset, value)
    },
    setUint8(offset: number, value: number): void {
      view.setUint8(offset, value)
    },
    setUint16(offset: number, value: number): void {
      view.setUint16(offset, value)
    },
    setUint32(offset: number, value: number): void {
      view.setUint32(offset, value)
    },
    setUint64(offset: number, value: bigint): void {
      view.setBigUint64(offset, value)
    }
  }
}

/**
 * @public
 */
export type ByteBuffer = ReturnType<typeof createByteBuffer>
