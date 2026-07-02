// The TextEncoder/TextDecoder polyfill now lives in the lean `@dcl/sdk/text-codec`
// subpath so it can be installed without pulling in the ethereum provider. This
// re-export keeps the historical `./text-encoder` import path working.
export { polyfillTextEncoder } from '../text-codec'
