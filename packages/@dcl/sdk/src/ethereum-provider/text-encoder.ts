import TextEncodingPolyfill from 'text-encoding'
import { setGlobalPolyfill } from '@dcl/ecs'

// NOTE: this function mutates globalThis — it is NOT pure. Do not annotate
// with /* @__PURE__ */; minifiers would treat the call as dead code and drop
// the polyfill installation, breaking runtime callers like
// compositeProvider.loadComposite that rely on globalThis.TextDecoder.
export function polyfillTextEncoder() {
  setGlobalPolyfill('TextEncoder', TextEncodingPolyfill.TextEncoder)
  setGlobalPolyfill('TextDecoder', TextEncodingPolyfill.TextDecoder)
}
