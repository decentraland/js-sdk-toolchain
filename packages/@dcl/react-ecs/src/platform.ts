/**
 * Platform detection hook for the UI scale system.
 *
 * react-ecs stays independent of the scene runtime (`~system/*` modules), so
 * it cannot ask the explorer which platform it runs on. Instead, the host SDK
 * injects the check at module-load time (see `@dcl/sdk/react-ecs`). Until a
 * provider is injected — or when none ever is — the platform is assumed to be
 * non-mobile.
 */
let isMobileProvider: () => boolean = () => false

/**
 * Injects the function used to detect whether the scene runs on a mobile
 * platform. Called by `@dcl/sdk` with its `isMobile()` platform helper.
 */
export function setIsMobileProvider(provider: () => boolean): void {
  isMobileProvider = provider
}

/**
 * Whether the scene is running on a mobile platform, according to the
 * injected provider. Platform detection is asynchronous on the SDK side, so
 * this may return false during the first ticks and flip to true once the
 * explorer information arrives.
 */
export function isMobile(): boolean {
  return isMobileProvider()
}
