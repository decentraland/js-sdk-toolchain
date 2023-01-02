import * as utf8 from '@protobufjs/utf8'

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
 * Creates a writable buffer
 */
export type WriteBufferOptions = {
  writing: {
    /**
     *  a buffer already allocated to write
     */
    buffer: Uint8Array
    /**
     * set the cursor to not start writing from the begin of it. Default 0
     */
    currentOffset?: number
  }
}

/**
 * Creates a writable buffer
 */
export type ReadBufferOptions = {
  reading: {
    /**
     * a buffer already allocated to read from there.
     */
    buffer: Uint8Array
    /**
     * delimite where the valid data ends. Default: buffer.length
     */
    length?: number
    /**
     * set the cursor where begins to read. Default 0
     */
    currentOffset: number
  }
}

export type CreateByteBufferOptions = {
  /**
   * The initial buffer, provide a buffer if you need to set "initial capacity"
   */
  buffer: Uint8Array
  /**
   * Set the cursor where begins to read. Default 0
   */
  readingOffset?: number
  /**
   * Set the cursor to not start writing from the begin of it.
   * Defaults to the buffer size
   */
  writeOffset?: number
}

const defaultInitialCapacity = 10240

class ReadWriteByteBuffer implements ByteBuffer {
  _buffer: Uint8Array
  view: DataView
  woffset: number
  roffset: number

  constructor(options?: CreateByteBufferOptions) {
    this._buffer =
      options?.buffer || new Uint8Array(defaultInitialCapacity)
    this.view = new DataView(this._buffer.buffer, this._buffer.byteOffset)
    this.woffset = options?.writeOffset ?? options?.buffer.length ?? 0
    this.roffset = options?.readingOffset ?? 0
  }

  /**
   * Increement the write offset and resize the buffer if it needs.
   */
  #woAdd(amount: number) {
    if (this.woffset + amount > this._buffer.byteLength) {
      const newsize = getNextSize(
        this._buffer.byteLength,
        this.woffset + amount
      )
      const newBuffer = new Uint8Array(newsize)
      newBuffer.set(this._buffer)
      const oldOffset = this._buffer.byteOffset
      this._buffer = newBuffer
      this.view = new DataView(this._buffer.buffer, oldOffset)
    }

    this.woffset += amount
    return this.woffset - amount
  }

  /**
   * Increment the read offset and throw an error if it's trying to read
   *  outside the bounds.
   */
  #roAdd(amount: number) {
    if (this.roffset + amount > this.woffset) {
      throw new Error('Outside of the bounds of writen data.')
    }

    this.roffset += amount
    return this.roffset - amount
  }

  buffer(): Uint8Array {
    return this._buffer
  }
  bufferLength(): number {
    return this._buffer.length
  }
  resetBuffer(): void {
    this.roffset = 0
    this.woffset = 0
  }
  currentReadOffset(): number {
    return this.roffset
  }
  currentWriteOffset(): number {
    return this.woffset
  }
  incrementReadOffset(amount: number): number {
    return this.#roAdd(amount)
  }
  remainingBytes(): number {
    return this.woffset - this.roffset
  }
  readFloat32(): number {
    return this.view.getFloat32(this.#roAdd(4))
  }
  readFloat64(): number {
    return this.view.getFloat64(this.#roAdd(8))
  }
  readInt8(): number {
    return this.view.getInt8(this.#roAdd(1))
  }
  readInt16(): number {
    return this.view.getInt16(this.#roAdd(2))
  }
  readInt32(): number {
    return this.view.getInt32(this.#roAdd(4))
  }
  readInt64(): bigint {
    return this.view.getBigInt64(this.#roAdd(8))
  }
  readUint8(): number {
    return this.view.getUint8(this.#roAdd(1))
  }
  readUint16(): number {
    return this.view.getUint16(this.#roAdd(2))
  }
  readUint32(): number {
    return this.view.getUint32(this.#roAdd(4))
  }
  readUint64(): bigint {
    return this.view.getBigUint64(this.#roAdd(8))
  }
  readBuffer() {
    const length = this.view.getUint32(this.#roAdd(4))
    return this._buffer.subarray(this.#roAdd(length), this.#roAdd(0))
  }
  readUtf8String() {
    const length = this.view.getUint32(this.#roAdd(4))
    return utf8.read(this._buffer, this.#roAdd(length), this.#roAdd(0))
  }
  incrementWriteOffset(amount: number): number {
    return this.#woAdd(amount)
  }
  size(): number {
    return this.woffset
  }
  toBinary() {
    return this._buffer.subarray(0, this.woffset)
  }
  toCopiedBinary() {
    return new Uint8Array(this.toBinary())
  }
  writeBuffer(value: Uint8Array, writeLength: boolean = true) {
    if (writeLength) {
      this.writeUint32(value.byteLength)
    }

    const o = this.#woAdd(value.byteLength)
    this._buffer.set(value, o)
  }
  writeUtf8String(value: string, writeLength: boolean = true) {
    const byteLength = utf8.length(value)

    if (writeLength) {
      this.writeUint32(byteLength)
    }

    const o = this.#woAdd(byteLength)

    utf8.write(value, this._buffer, o)
  }
  writeFloat32(value: number): void {
    const o = this.#woAdd(4)
    this.view.setFloat32(o, value)
  }
  writeFloat64(value: number): void {
    const o = this.#woAdd(8)
    this.view.setFloat64(o, value)
  }
  writeInt8(value: number): void {
    const o = this.#woAdd(1)
    this.view.setInt8(o, value)
  }
  writeInt16(value: number): void {
    const o = this.#woAdd(2)
    this.view.setInt16(o, value)
  }
  writeInt32(value: number): void {
    const o = this.#woAdd(4)
    this.view.setInt32(o, value)
  }
  writeInt64(value: bigint): void {
    const o = this.#woAdd(8)
    this.view.setBigInt64(o, value)
  }
  writeUint8(value: number): void {
    const o = this.#woAdd(1)
    this.view.setUint8(o, value)
  }
  writeUint16(value: number): void {
    const o = this.#woAdd(2)
    this.view.setUint16(o, value)
  }
  writeUint32(value: number): void {
    const o = this.#woAdd(4)
    this.view.setUint32(o, value)
  }
  writeUint64(value: bigint): void {
    const o = this.#woAdd(8)
    this.view.setBigUint64(o, value)
  }
  // DataView Proxy
  getFloat32(offset: number): number {
    return this.view.getFloat32(offset)
  }
  getFloat64(offset: number): number {
    return this.view.getFloat64(offset)
  }
  getInt8(offset: number): number {
    return this.view.getInt8(offset)
  }
  getInt16(offset: number): number {
    return this.view.getInt16(offset)
  }
  getInt32(offset: number): number {
    return this.view.getInt32(offset)
  }
  getInt64(offset: number): bigint {
    return this.view.getBigInt64(offset)
  }
  getUint8(offset: number): number {
    return this.view.getUint8(offset)
  }
  getUint16(offset: number): number {
    return this.view.getUint16(offset)
  }
  getUint32(offset: number): number {
    return this.view.getUint32(offset)
  }
  getUint64(offset: number): bigint {
    return this.view.getBigUint64(offset)
  }
  setFloat32(offset: number, value: number): void {
    this.view.setFloat32(offset, value)
  }
  setFloat64(offset: number, value: number): void {
    this.view.setFloat64(offset, value)
  }
  setInt8(offset: number, value: number): void {
    this.view.setInt8(offset, value)
  }
  setInt16(offset: number, value: number): void {
    this.view.setInt16(offset, value)
  }
  setInt32(offset: number, value: number): void {
    this.view.setInt32(offset, value)
  }
  setInt64(offset: number, value: bigint): void {
    this.view.setBigInt64(offset, value)
  }
  setUint8(offset: number, value: number): void {
    this.view.setUint8(offset, value)
  }
  setUint16(offset: number, value: number): void {
    this.view.setUint16(offset, value)
  }
  setUint32(offset: number, value: number): void {
    this.view.setUint32(offset, value)
  }
  setUint64(offset: number, value: bigint): void {
    this.view.setBigUint64(offset, value)
  }
}

/**
 * ByteBuffer is a wrapper of DataView which also adds a read and write offset.
 *  Also in a write operation it resizes the buffer is being used if it needs.
 *
 * - Use read and write function to generate or consume data.
 * - Use set and get only if you are sure that you're doing.
 */
export function createByteBuffer(
  options?: CreateByteBufferOptions
): ByteBuffer {
  return new ReadWriteByteBuffer(options)
}

/**
 * @public
 */
export type ByteBuffer = {
  /**
   * @returns The entire current Uint8Array.
   *
   * WARNING: if the buffer grows, the view had changed itself,
   *  and the reference will be a invalid one.
   */
  buffer(): Uint8Array
  /**
   * @returns The capacity of the current buffer
   */
  bufferLength(): number
  /**
   * Resets byteBuffer to avoid creating a new one
   */
  resetBuffer(): void
  /**
   * @returns The current read offset
   */
  currentReadOffset(): number
  /**
   * @returns The current write offset
   */
  currentWriteOffset(): number
  /**
   * Reading purpose
   * Returns the previuos offsset size before incrementing
   */
  incrementReadOffset(amount: number): number
  /**
   * @returns How many bytes are available to read.
   */
  remainingBytes(): number
  readFloat32(): number
  readFloat64(): number
  readInt8(): number
  readInt16(): number
  readInt32(): number
  readInt64(): bigint
  readUint8(): number
  readUint16(): number
  readUint32(): number
  readUint64(): bigint
  readBuffer(): Uint8Array
  readUtf8String(): string
  /**
   * Writing purpose
   */
  /**
   * Increment offset
   * @param amount - how many bytes
   * @returns The offset when this reserving starts.
   */
  incrementWriteOffset(amount: number): number
  /**
   * @returns The total number of bytes writen in the buffer.
   */
  size(): number
  /**
   * Take care using this function, if you modify the data after, the
   * returned subarray will change too. If you'll modify the content of the
   * bytebuffer, maybe you want to use toCopiedBinary()
   *
   * @returns The subarray from 0 to offset as reference.
   */
  toBinary(): Uint8Array

  /**
   * Safe copied buffer of the current data of ByteBuffer
   *
   * @returns The subarray from 0 to offset.
   */
  toCopiedBinary(): Uint8Array

  writeUtf8String(value: string, writeLength?: boolean): void
  writeBuffer(value: Uint8Array, writeLength?: boolean): void
  writeFloat32(value: number): void
  writeFloat64(value: number): void
  writeInt8(value: number): void
  writeInt16(value: number): void
  writeInt32(value: number): void
  writeInt64(value: bigint): void
  writeUint8(value: number): void
  writeUint16(value: number): void
  writeUint32(value: number): void
  writeUint64(value: bigint): void
  // Dataview Proxy
  getFloat32(offset: number): number
  getFloat64(offset: number): number
  getInt8(offset: number): number
  getInt16(offset: number): number
  getInt32(offset: number): number
  getInt64(offset: number): bigint
  getUint8(offset: number): number
  getUint16(offset: number): number
  getUint32(offset: number): number
  getUint64(offset: number): bigint
  setFloat32(offset: number, value: number): void
  setFloat64(offset: number, value: number): void
  setInt8(offset: number, value: number): void
  setInt16(offset: number, value: number): void
  setInt32(offset: number, value: number): void
  setInt64(offset: number, value: bigint): void
  setUint8(offset: number, value: number): void
  setUint16(offset: number, value: number): void
  setUint32(offset: number, value: number): void
  setUint64(offset: number, value: bigint): void
}
