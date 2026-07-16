import { EntityState, type Entity, type IEngine, type PointerEventsSystem } from '@dcl/ecs'
import * as ecsComponents from '@dcl/ecs/dist/components'
import React from 'react'
import type { ReactEcs } from './react-ecs'
import { createReconciler } from './reconciler'
import {
  getUiScaleFactor,
  resetInteractableArea,
  resetScreenInsetArea,
  resetUiScaleFactor,
  setInteractableArea,
  setScreenInsetArea,
  setUiScaleFactor
} from './components/utils'
import { InteractableArea, ScreenInsetArea } from './components'
import { isMobile } from './platform'

// react-ecs compiles with `types: []` (no runtime typings), so the console
// global provided by the scene runtime is declared here.
declare const console: { log(message: string): void }

/**
 * @public
 */
export type UiComponent = () => ReactEcs.JSX.ReactNode

/**
 * Screen area used to position a renderer's UI entities:
 * - `'device'`: the device safe area (excludes notch, status bar, rounded corners),
 *   reported in `UiCanvasInformation.screenInsetArea`.
 * - `'interactable'`: the area free of the Explorer's native HUD (minimap, chat, ...),
 *   reported in `UiCanvasInformation.interactableArea`.
 * - `'none'`: the whole screen, with 0,0 at its top-left corner.
 * @public
 */
export type UiScreenInset = 'device' | 'interactable' | 'none'

/**
 * @public
 */
export type UiRendererOptions = {
  virtualWidth?: number
  virtualHeight?: number
  /**
   * Screen area the renderer's UI is positioned in. Defaults to `'none'` (whole screen).
   * Each renderer honors its own value, so the main UI and additional renderers can
   * use different insets simultaneously.
   */
  screenInset?: UiScreenInset
}

type VirtualSize = {
  virtualWidth: number
  virtualHeight: number
}

/**
 * Default virtual screen size used on mobile platforms, and the size 16:9
 * virtual screens are overridden to on mobile (phone screens are much wider
 * than 16:9, so a 16:9 virtual canvas would letterbox the UI).
 */
const DEFAULT_MOBILE_VIRTUAL_SIZE: VirtualSize = { virtualWidth: 1600, virtualHeight: 720 }

/**
 * Default virtual screen size used on non-mobile platforms.
 */
const DEFAULT_VIRTUAL_SIZE: VirtualSize = { virtualWidth: 1920, virtualHeight: 1080 }

function hasVirtualSize(options: UiRendererOptions | undefined): boolean {
  return !!options && (options.virtualWidth !== undefined || options.virtualHeight !== undefined)
}

function isValidVirtualSize(options: UiRendererOptions | undefined): options is UiRendererOptions & VirtualSize {
  return !!options && (options.virtualWidth ?? 0) > 0 && (options.virtualHeight ?? 0) > 0
}

function is16by9(options: VirtualSize): boolean {
  return options.virtualWidth * 9 === options.virtualHeight * 16
}

/**
 * @public
 */
export interface ReactBasedUiSystem {
  /**
   * Destroy all UI entities and unregister related systems.
   */
  destroy(): void
  /**
   * Set the main UI renderer. Optional virtual size defines the global UI scale factor.
   *
   * When no virtual size is provided, a platform default is used: 1600x720 on
   * mobile, 1920x1080 otherwise. Providing an invalid size (values \<= 0)
   * disables the virtual screen (no UI scaling). On mobile, a provided 16:9
   * virtual size is overridden to 1600x720 to fit phone screens.
   *
   * The optional `screenInset` selects the screen area the UI is positioned in
   * (see {@link UiScreenInset}); it defaults to `'none'` (whole screen).
   */
  setUiRenderer(ui: UiComponent, options?: UiRendererOptions): void
  /**
   * Add a UI renderer associated with an entity. The UI will be automatically cleaned up
   * when the entity is removed from the engine.
   *
   * If a renderer is already associated with the given entity, it will be replaced.
   *
   * This allows dynamically adding UI Renderers that are rendered alongside the main
   * UI set via setUiRenderer().
   *
   * @param entity - The entity to associate with this UI renderer. When the entity is removed,
   *                 the UI renderer is automatically cleaned up.
   * @param ui - The UI component to render
   * @param options - Optional virtual size used for UI scale factor when main UI has none.
   *                  Defaults and the mobile 16:9 override behave as in {@link ReactBasedUiSystem.setUiRenderer}.
   *                  `screenInset` is honored per renderer, independently of the main UI's value.
   */
  addUiRenderer(entity: Entity, ui: UiComponent, options?: UiRendererOptions): void
  /**
   * Remove a previously added UI renderer by its associated entity.
   * It does not affect the main UI renderer.
   * @param entity - The entity whose UI renderer should be removed
   */
  removeUiRenderer(entity: Entity): void
}

/**
 * @public
 */
export function createReactBasedUiSystem(engine: IEngine, pointerSystem: PointerEventsSystem): ReactBasedUiSystem {
  const renderer = createReconciler(engine, pointerSystem)
  let uiComponent: UiComponent | undefined = undefined
  let mainOptions: UiRendererOptions | undefined = undefined
  const additionalRenderers = new Map<Entity, { ui: UiComponent; options?: UiRendererOptions }>()
  const UiCanvasInformation = ecsComponents.UiCanvasInformation(engine)

  // Unique owner to prevent other UI systems resetting this scale factor.
  const uiScaleFactorOwner = Symbol('react-ecs-ui-scale')
  // Unique owner for the screen inset module variable.
  const screenInsetAreaOwner = Symbol('react-ecs-screen-inset-area')
  // Unique owner for the interactable area module variable.
  const interactableAreaOwner = Symbol('react-ecs-interactable-area')

  // Last 16:9 size we already logged the mobile override for, so the log
  // fires once per provided size instead of every tick. Tracked as raw numbers
  // to avoid allocating a comparison string every tick.
  let loggedMobileOverrideW = 0
  let loggedMobileOverrideH = 0

  function getActiveVirtualSize(): UiRendererOptions | undefined {
    // Main renderer options win; otherwise use the first additional renderer option.
    // Options carrying no virtual dims (e.g. only a screen inset) are skipped so
    // they don't count as a provided-but-invalid virtual size.
    if (hasVirtualSize(mainOptions)) return mainOptions
    for (const entry of additionalRenderers.values()) {
      if (hasVirtualSize(entry.options)) return entry.options
    }
    return undefined
  }

  /**
   * Resolves the virtual screen to scale the UI against, or `undefined` when
   * the virtual screen is disabled.
   */
  function resolveVirtualSize(): VirtualSize | undefined {
    const provided = getActiveVirtualSize()
    const mobile = isMobile()

    // No creator-provided size: fall back to the platform default.
    if (!provided) {
      return mobile ? DEFAULT_MOBILE_VIRTUAL_SIZE : DEFAULT_VIRTUAL_SIZE
    }

    // An explicitly provided but invalid size (values <= 0) disables the
    // virtual screen — no UI scaling at all.
    if (!isValidVirtualSize(provided)) {
      return undefined
    }

    // On mobile, 16:9 virtual screens don't fit phone aspect ratios — override them.
    if (mobile && is16by9(provided)) {
      if (loggedMobileOverrideW !== provided.virtualWidth || loggedMobileOverrideH !== provided.virtualHeight) {
        loggedMobileOverrideW = provided.virtualWidth
        loggedMobileOverrideH = provided.virtualHeight
        console.log(
          `Mobile platform detected: overriding 16:9 virtual screen size ${provided.virtualWidth}x${provided.virtualHeight} with ${DEFAULT_MOBILE_VIRTUAL_SIZE.virtualWidth}x${DEFAULT_MOBILE_VIRTUAL_SIZE.virtualHeight}`
        )
      }
      return DEFAULT_MOBILE_VIRTUAL_SIZE
    }

    return provided
  }

  /**
   * Wraps a renderer's component in a container positioned within the selected
   * screen inset area. `'none'` (the default) adds no wrapper so the current
   * full-screen behavior is preserved as-is. Applied per renderer, so each
   * renderer can use a different inset.
   */
  function wrapWithScreenInset(ui: UiComponent, inset: UiScreenInset | undefined, key: string): React.ReactNode {
    if (inset === 'device') {
      return React.createElement(ScreenInsetArea as any, { key }, React.createElement(ui as any))
    }
    if (inset === 'interactable') {
      return React.createElement(InteractableArea as any, { key }, React.createElement(ui as any))
    }
    return React.createElement(ui as any, { key })
  }

  function ReactBasedUiSystem() {
    const components: React.ReactNode[] = []

    // Add main UI component
    if (uiComponent) {
      components.push(wrapWithScreenInset(uiComponent, mainOptions?.screenInset, '__main__'))
    }

    const entitiesToRemove: Entity[] = []
    for (const [entity, entry] of additionalRenderers) {
      // Check for entity-based cleanup
      if (engine.getEntityState(entity) === EntityState.Removed) {
        entitiesToRemove.push(entity)
      } else {
        components.push(wrapWithScreenInset(entry.ui, entry.options?.screenInset, `__entity_${entity}__`))
      }
    }

    // Entity-based cleanup
    for (const entity of entitiesToRemove) {
      additionalRenderers.delete(entity)
    }

    // Always update the renderer - pass null when empty to clear the UI
    if (components.length > 0) {
      renderer.update(React.createElement(React.Fragment, null, ...components))
    } else {
      renderer.update(null)
    }
  }

  function UiScaleSystem() {
    const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)

    // Update the screen inset module variable unconditionally — it is
    // independent of the virtual size and useful even when the renderer has no
    // virtual canvas.
    if (canvasInfo?.screenInsetArea) {
      setScreenInsetArea(canvasInfo.screenInsetArea, screenInsetAreaOwner)
    }

    // Update the interactable area module variable unconditionally.
    if (canvasInfo?.interactableArea) {
      setInteractableArea(canvasInfo.interactableArea, interactableAreaOwner)
    }

    // The virtual screen (provided or defaulted) only applies while some
    // renderer is registered; with no UI at all the scale factor is released.
    if (uiComponent === undefined && additionalRenderers.size === 0) {
      // Reset only if this system owns the scale factor.
      resetUiScaleFactor(uiScaleFactorOwner)
      return
    }

    const activeVirtualSize = resolveVirtualSize()
    if (!activeVirtualSize) {
      // Virtual screen explicitly disabled by an invalid provided size.
      resetUiScaleFactor(uiScaleFactorOwner)
      return
    }

    if (!canvasInfo) return

    const { width, height, devicePixelRatio } = canvasInfo
    const { virtualWidth, virtualHeight } = activeVirtualSize

    // Normalize by devicePixelRatio so virtual px map to logical px (matching the
    // vw/vh path); without it the scale was inflated on high-dpr mobile screens.
    const ratio = devicePixelRatio || 1
    const nextScale = Math.min(width / virtualWidth, height / virtualHeight) / ratio
    if (Number.isFinite(nextScale) && nextScale !== getUiScaleFactor()) {
      // Track ownership when updating to avoid cross-system conflicts.
      setUiScaleFactor(nextScale, uiScaleFactorOwner)
    }
  }

  engine.addSystem(UiScaleSystem, 100e3 + 1, '@dcl/react-ecs-ui-scale')
  engine.addSystem(ReactBasedUiSystem, 100e3, '@dcl/react-ecs')

  return {
    destroy() {
      engine.removeSystem(UiScaleSystem)
      engine.removeSystem(ReactBasedUiSystem)
      resetUiScaleFactor(uiScaleFactorOwner)
      resetScreenInsetArea(screenInsetAreaOwner)
      resetInteractableArea(interactableAreaOwner)
      for (const entity of renderer.getEntities()) {
        engine.removeEntity(entity)
      }
    },
    setUiRenderer(ui: UiComponent, options?: UiRendererOptions) {
      uiComponent = ui
      mainOptions = options
    },
    addUiRenderer(entity: Entity, ui: UiComponent, options?: UiRendererOptions) {
      additionalRenderers.set(entity, { ui, options })
    },
    removeUiRenderer(entity: Entity) {
      additionalRenderers.delete(entity)
    }
  }
}
