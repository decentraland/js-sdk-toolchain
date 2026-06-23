// Mock of @dcl/sdk/platform. isMobile() follows the selected canvas at runtime
// (the page sets globalThis.__previewMobile from the canvas-size selector), and
// falls back to the PREVIEW_MOBILE build flag.
declare const __PREVIEW_MOBILE__: boolean

export function isMobile() {
  const runtime = (globalThis as { __previewMobile?: boolean }).__previewMobile
  if (typeof runtime === 'boolean') return runtime
  return typeof __PREVIEW_MOBILE__ !== 'undefined' ? __PREVIEW_MOBILE__ : false
}
