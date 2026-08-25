import { setGlobalPolyfill } from '@dcl/ecs'
import { decodeUtf8, encodeUtf8, encodeUtf8Into } from './internal/utf8'

/**
 * WHATWG-shaped `TextEncoder` / `TextDecoder` over the SDK's own UTF-8 codec.
 *
 * UTF-8 is the only supported encoding: the decoder throws a `RangeError` for
 * any other label instead of silently mis-decoding, and rejects `{ stream: true }`.
 */

// Labels the WHATWG Encoding Standard maps to utf-8.
const UTF8_LABELS = ['unicode-1-1-utf-8', 'unicode11utf8', 'unicode20utf8', 'utf-8', 'utf8', 'x-unicode20utf8']

function toUint8Array(input?: ArrayBuffer | ArrayBufferView): Uint8Array {
  if (input === undefined) return new Uint8Array(0)
  if (input instanceof Uint8Array) return input
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  return new Uint8Array(input)
}

export class TextEncoder {
  readonly encoding = 'utf-8'

  encode(input: string = ''): Uint8Array {
    return encodeUtf8(String(input))
  }

  encodeInto(source: string, destination: Uint8Array): { read: number; written: number } {
    return encodeUtf8Into(String(source), destination)
  }
}

export class TextDecoder {
  readonly encoding = 'utf-8'
  readonly fatal: boolean
  readonly ignoreBOM: boolean

  constructor(label: string = 'utf-8', options: { fatal?: boolean; ignoreBOM?: boolean } = {}) {
    // the spec strips ASCII whitespace only, so String.prototype.trim is too wide
    const normalized = String(label)
      .replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '')
      .toLowerCase()
    if (!UTF8_LABELS.includes(normalized)) {
      throw new RangeError(`TextDecoder: only utf-8 is supported, got "${label}"`)
    }
    this.fatal = options.fatal === true
    this.ignoreBOM = options.ignoreBOM === true
  }

  decode(input?: ArrayBuffer | ArrayBufferView, options: { stream?: boolean } = {}): string {
    if (options.stream) throw new TypeError('TextDecoder: streaming is not supported')
    return decodeUtf8(toUint8Array(input), { fatal: this.fatal, ignoreBOM: this.ignoreBOM })
  }
}

/**
 * Install `TextEncoder` / `TextDecoder` on `globalThis` where the runtime does
 * not provide them (native implementations always win over these polyfills).
 *
 * Exposed from the lean `@dcl/sdk/text-codec` subpath so consumers can install
 * the polyfill without pulling in the ethereum provider.
 */
// NOTE: this function mutates globalThis — it is NOT pure. Do not annotate
// with /* @__PURE__ */; minifiers would treat the call as dead code and drop
// the polyfill installation, breaking third-party code that relies on
// globalThis.TextDecoder.
export function polyfillTextEncoder() {
  setGlobalPolyfill('TextEncoder', TextEncoder)
  setGlobalPolyfill('TextDecoder', TextDecoder)
}
