import TextEncodingPolyfill from 'text-encoding'
import { setGlobalPolyfill } from '@dcl/ecs'

/**
 * Install the `TextEncoder` / `TextDecoder` polyfill on `globalThis`.
 *
 * The QuickJS scene runtime ships no native `TextEncoder` / `TextDecoder`, yet
 * `compositeProvider.loadComposite` decodes `.composite` JSON file bytes via
 * `TextDecoder`. Callers that load composites at runtime (e.g. `@dcl/asset-packs`'
 * `SPAWN_ENTITY`) must install this first.
 *
 * Exposed from the lean `@dcl/sdk/text-codec` subpath so consumers can install
 * the polyfill without pulling in the ethereum provider, and without bundling
 * `text-encoding` into scenes that never reach this module.
 */
// NOTE: this function mutates globalThis — it is NOT pure. Do not annotate
// with /* @__PURE__ */; minifiers would treat the call as dead code and drop
// the polyfill installation, breaking runtime callers like
// compositeProvider.loadComposite that rely on globalThis.TextDecoder.
export function polyfillTextEncoder() {
  setGlobalPolyfill('TextEncoder', TextEncodingPolyfill.TextEncoder)
  setGlobalPolyfill('TextDecoder', TextEncodingPolyfill.TextDecoder)
}
