import TextEncodingPolyfill from 'text-encoding'
import { setGlobalPolyfill } from '@dcl/ecs/src/runtime/globals'

/* @__PURE__ */
export function polyfillTextEncoder() {
  setGlobalPolyfill('TextEncoder', TextEncodingPolyfill.TextEncoder)
  setGlobalPolyfill('TextDecoder', TextEncodingPolyfill.TextDecoder)
}
