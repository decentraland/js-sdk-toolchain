import TextEncodingPolyfill from 'text-encoding'

/* @__PURE__ */
export function polyfillTextEncoder() {
  ;(globalThis as any).TextEncoder = (globalThis as any).TextEncoder ?? TextEncodingPolyfill.TextEncoder
  ;(globalThis as any).TextDecoder = (globalThis as any).TextDecoder ?? TextEncodingPolyfill.TextDecoder
}
