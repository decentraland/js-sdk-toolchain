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
import { isMobile } from './platform'

// react-ecs compiles with `types: []` (no runtime typings), so the console
// global provided by the scene runtime is declared here.
declare const console: { log(message: string): void }

/**
 * @public
 */
export type UiComponent = () => ReactEcs.JSX.ReactNode

/**
 * @public
 */
export type UiRendererOptions = {
  virtualWidth: number
  virtualHeight: number
}

/**
 * Default virtual screen size used on mobile platforms, and the size 16:9
 * virtual screens are overridden to on mobile (phone screens are much wider
 * than 16:9, so a 16:9 virtual canvas would letterbox the UI).
 */
const DEFAULT_MOBILE_VIRTUAL_SIZE: UiRendererOptions = { virtualWidth: 1600, virtualHeight: 720 }

/**
 * Default virtual screen size used on non-mobile platforms.
 */
const DEFAULT_VIRTUAL_SIZE: UiRendererOptions = { virtualWidth: 1920, virtualHeight: 1080 }

function isValidVirtualSize(options: UiRendererOptions | undefined): options is UiRendererOptions {
  return !!options && options.virtualWidth > 0 && options.virtualHeight > 0
}

function is16by9(options: UiRendererOptions): boolean {
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
  let virtualSize: UiRendererOptions | undefined = undefined
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
    if (virtualSize) return virtualSize
    for (const entry of additionalRenderers.values()) {
      if (entry.options) return entry.options
    }
    return undefined
  }

  /**
   * Resolves the virtual screen to scale the UI against, or `undefined` when
   * the virtual screen is disabled.
   */
  function resolveVirtualSize(): UiRendererOptions | undefined {
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

  function ReactBasedUiSystem() {
    const components: React.ReactNode[] = []

    // Add main UI component
    if (uiComponent) {
      components.push(React.createElement(uiComponent as any, { key: '__main__' }))
    }

    const entitiesToRemove: Entity[] = []
    for (const [entity, entry] of additionalRenderers) {
      // Check for entity-based cleanup
      if (engine.getEntityState(entity) === EntityState.Removed) {
        entitiesToRemove.push(entity)
      } else {
        components.push(React.createElement(entry.ui as any, { key: `__entity_${entity}__` }))
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
      virtualSize = options
    },
    addUiRenderer(entity: Entity, ui: UiComponent, options?: UiRendererOptions) {
      additionalRenderers.set(entity, { ui, options })
    },
    removeUiRenderer(entity: Entity) {
      additionalRenderers.delete(entity)
    }
  }
}
