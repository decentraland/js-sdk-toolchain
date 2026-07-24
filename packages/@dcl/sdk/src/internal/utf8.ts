/**
 * Self-contained UTF-8 codec implementing the WHATWG Encoding Standard
 * algorithms (https://encoding.spec.whatwg.org/), so SDK code never depends
 * on the host providing `TextEncoder` / `TextDecoder` globals.
 */

const REPLACEMENT_CHARACTER = 0xfffd

export type DecodeUtf8Options = {
  fatal?: boolean
  ignoreBOM?: boolean
}

export function decodeUtf8(input: Uint8Array, options: DecodeUtf8Options = {}): string {
  const fatal = options.fatal === true
  const start =
    !options.ignoreBOM && input.length >= 3 && input[0] === 0xef && input[1] === 0xbb && input[2] === 0xbf ? 3 : 0

  let result = ''
  let pending: number[] = []
  let codePoint = 0
  let bytesNeeded = 0
  let bytesSeen = 0
  let lowerBoundary = 0x80
  let upperBoundary = 0xbf

  function emit(value: number) {
    if (value <= 0xffff) {
      pending.push(value)
    } else {
      const offset = value - 0x10000
      pending.push(0xd800 + (offset >> 10), 0xdc00 + (offset & 0x3ff))
    }
    if (pending.length >= 4096) {
      result += String.fromCharCode(...pending)
      pending = []
    }
  }

  function malformed() {
    if (fatal) throw new TypeError('decodeUtf8: the encoded data is not valid utf-8')
    emit(REPLACEMENT_CHARACTER)
  }

  for (let i = start; i < input.length; i++) {
    const byte = input[i]
    if (bytesNeeded === 0) {
      if (byte <= 0x7f) {
        emit(byte)
      } else if (byte >= 0xc2 && byte <= 0xdf) {
        bytesNeeded = 1
        codePoint = byte & 0x1f
      } else if (byte >= 0xe0 && byte <= 0xef) {
        if (byte === 0xe0) lowerBoundary = 0xa0
        if (byte === 0xed) upperBoundary = 0x9f
        bytesNeeded = 2
        codePoint = byte & 0xf
      } else if (byte >= 0xf0 && byte <= 0xf4) {
        if (byte === 0xf0) lowerBoundary = 0x90
        if (byte === 0xf4) upperBoundary = 0x8f
        bytesNeeded = 3
        codePoint = byte & 0x7
      } else {
        malformed()
      }
    } else if (byte < lowerBoundary || byte > upperBoundary) {
      codePoint = 0
      bytesNeeded = 0
      bytesSeen = 0
      lowerBoundary = 0x80
      upperBoundary = 0xbf
      malformed()
      // the spec prepends the byte back to the stream: it starts a new sequence
      i--
    } else {
      lowerBoundary = 0x80
      upperBoundary = 0xbf
      codePoint = (codePoint << 6) | (byte & 0x3f)
      if (++bytesSeen === bytesNeeded) {
        emit(codePoint)
        codePoint = 0
        bytesNeeded = 0
        bytesSeen = 0
      }
    }
  }
  if (bytesNeeded !== 0) malformed()

  if (pending.length > 0) result += String.fromCharCode(...pending)
  return result
}

export function encodeUtf8(input: string): Uint8Array {
  const output = new Uint8Array(utf8ByteLength(input))
  let offset = 0
  for (let i = 0; i < input.length; i++) {
    const codePoint = codePointAt(input, i)
    if (codePoint > 0xffff) i++
    offset = writeCodePoint(output, offset, codePoint)
  }
  return output
}

export function encodeUtf8Into(source: string, destination: Uint8Array): { read: number; written: number } {
  let read = 0
  let written = 0
  for (let i = 0; i < source.length; i++) {
    const codePoint = codePointAt(source, i)
    const size = byteSize(codePoint)
    if (written + size > destination.length) break
    written = writeCodePoint(destination, written, codePoint)
    if (codePoint > 0xffff) {
      i++
      read += 2
    } else {
      read += 1
    }
  }
  return { read, written }
}

// Reads the code point at index, replacing unpaired surrogates with U+FFFD
// (the USVString conversion `TextEncoder` mandates).
function codePointAt(input: string, index: number): number {
  const first = input.charCodeAt(index)
  if (first >= 0xd800 && first <= 0xdbff) {
    const second = index + 1 < input.length ? input.charCodeAt(index + 1) : 0
    if (second >= 0xdc00 && second <= 0xdfff) return 0x10000 + ((first - 0xd800) << 10) + (second - 0xdc00)
    return REPLACEMENT_CHARACTER
  }
  if (first >= 0xdc00 && first <= 0xdfff) return REPLACEMENT_CHARACTER
  return first
}

function byteSize(codePoint: number): number {
  return codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4
}

function utf8ByteLength(input: string): number {
  let length = 0
  for (let i = 0; i < input.length; i++) {
    const codePoint = codePointAt(input, i)
    if (codePoint > 0xffff) i++
    length += byteSize(codePoint)
  }
  return length
}

function writeCodePoint(output: Uint8Array, offset: number, codePoint: number): number {
  let next = offset
  if (codePoint <= 0x7f) {
    output[next++] = codePoint
  } else if (codePoint <= 0x7ff) {
    output[next++] = 0xc0 | (codePoint >> 6)
    output[next++] = 0x80 | (codePoint & 0x3f)
  } else if (codePoint <= 0xffff) {
    output[next++] = 0xe0 | (codePoint >> 12)
    output[next++] = 0x80 | ((codePoint >> 6) & 0x3f)
    output[next++] = 0x80 | (codePoint & 0x3f)
  } else {
    output[next++] = 0xf0 | (codePoint >> 18)
    output[next++] = 0x80 | ((codePoint >> 12) & 0x3f)
    output[next++] = 0x80 | ((codePoint >> 6) & 0x3f)
    output[next++] = 0x80 | (codePoint & 0x3f)
  }
  return next
}
