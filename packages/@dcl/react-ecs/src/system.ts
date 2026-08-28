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
 * - `'device'` (default): the device safe area (excludes notch, status bar,
 *   rounded corners), reported in `UiCanvasInformation.screenInsetArea`.
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
   * Screen area the renderer's UI is positioned in. Defaults to `'device'`, so UI
   * stays inside the device safe area unless the creator opts out with `'none'`.
   * Each renderer honors its own value, so the main UI and additional renderers
   * can use different insets simultaneously.
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

/**
 * Screen area a renderer uses when it doesn't pick one. UI defaults to the device
 * safe area: drawing under a notch, a status bar or a rounded corner is something
 * a creator should opt into, not the out-of-the-box behavior.
 */
const DEFAULT_SCREEN_INSET: UiScreenInset = 'device'

function hasVirtualSize(options: UiRendererOptions | undefined): boolean {
  return !!options && (options.virtualWidth !== undefined || options.virtualHeight !== undefined)
}

function isValidVirtualSize(options: UiRendererOptions | undefined): options is UiRendererOptions & VirtualSize {
  return !!options && (options.virtualWidth ?? 0) > 0 && (options.virtualHeight ?? 0) > 0
}

/**
 * Whether a provided size spells out one dimension but not the other. Both are
 * optional in the type, so this is reachable. It is invalid either way — this only
 * decides whether to warn, since a half-given size is a mistake while a value
 * \<= 0 is the documented way to turn the virtual screen off.
 */
function isPartialVirtualSize(options: UiRendererOptions): boolean {
  return (options.virtualWidth === undefined) !== (options.virtualHeight === undefined)
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
   * mobile, 1920x1080 otherwise. Providing an invalid size disables the virtual
   * screen (no UI scaling): either a value \<= 0, or only one of the two
   * dimensions, which additionally logs a warning. On mobile, a provided 16:9
   * virtual size is overridden to 1600x720 to fit phone screens.
   *
   * The optional `screenInset` selects the screen area the UI is positioned in
   * (see {@link UiScreenInset}); it defaults to `'device'`. Pass `'none'` to
   * place the UI over the whole screen.
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
   *                  `screenInset` is honored per renderer, independently of the main UI's value,
   *                  and defaults to `'device'` here too.
   */
  addUiRenderer(entity: Entity, ui: UiComponent, options?: UiRendererOptions): void
  /**
   * Remove a previously added UI renderer by its associated entity.
   * It does not affect the main UI renderer.
   * @param entity - The entity whose UI renderer should be removed
   */
  removeUiRenderer(entity: Entity): void
  /**
   * Render a UI tree to a texture. The tree is rooted at `entity`, which must carry a UiCanvas
   * describing the texture; the result can be sampled through `TextureUnion.uiTexture`. Replaces
   * any texture renderer already set on the entity, and is torn down when the entity is removed.
   *
   * @param entity - The UiCanvas entity the UI tree hangs from
   * @param ui - The UI component to render
   */
  setTextureRenderer(entity: Entity, ui: UiComponent): void
  /**
   * Remove a texture renderer previously set with setTextureRenderer(), destroying its entities.
   * @param entity - The UiCanvas entity the renderer was set on
   */
  removeTextureRenderer(entity: Entity): void
}

/**
 * @public
 */
export function createReactBasedUiSystem(engine: IEngine, pointerSystem: PointerEventsSystem): ReactBasedUiSystem {
  const renderer = createReconciler(engine, pointerSystem)
  let uiComponent: UiComponent | undefined = undefined
  let mainOptions: UiRendererOptions | undefined = undefined
  const additionalRenderers = new Map<Entity, { ui: UiComponent; options?: UiRendererOptions }>()
  // UI trees rendered to a texture, keyed by their UiCanvas entity. Each needs its own reconciler
  // because the root parent is a per-reconciler property.
  const textureRenderers = new Map<Entity, { renderer: ReturnType<typeof createReconciler>; ui: UiComponent }>()

  function destroyTextureRenderer(entity: Entity) {
    const entry = textureRenderers.get(entity)
    if (!entry) return
    textureRenderers.delete(entity)
    for (const uiEntity of entry.renderer.getEntities()) {
      engine.removeEntity(uiEntity)
    }
  }
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

  // Same once-per-size guard for the incomplete-size warning. A partial size maps
  // its missing dimension to 0, and the provided one can itself be 0, so -1 is the
  // "nothing logged yet" sentinel — 0/0 is a reachable real value here.
  let loggedPartialW = -1
  let loggedPartialH = -1

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

    // An explicitly provided but invalid size disables the virtual screen — no UI
    // scaling at all. That covers a value <= 0 (the deliberate opt-out) and a size
    // that gives only one of its two dimensions.
    if (!isValidVirtualSize(provided)) {
      // A half-given size is a mistake rather than an opt-out, and disabling scaling
      // is not what the creator was reaching for, so say so once per provided size.
      // The <= 0 opt-out is documented and stays silent.
      if (isPartialVirtualSize(provided)) {
        const width = provided.virtualWidth ?? 0
        const height = provided.virtualHeight ?? 0
        if (loggedPartialW !== width || loggedPartialH !== height) {
          loggedPartialW = width
          loggedPartialH = height
          console.log(
            `Incomplete virtual screen size (virtualWidth: ${provided.virtualWidth}, virtualHeight: ${provided.virtualHeight}): both dimensions are required, so the virtual screen is disabled and no UI scaling is applied.`
          )
        }
      }
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
   * screen inset area. `'none'` adds no wrapper, leaving the UI on the whole
   * screen. Applied per renderer, so each renderer can use a different inset.
   */
  function wrapWithScreenInset(ui: UiComponent, inset: UiScreenInset | undefined, key: string): React.ReactNode {
    // An omitted inset is resolved to DEFAULT_SCREEN_INSET ('device') before the
    // switch, so it lands on `case 'device'`. Only an explicit 'none' reaches the
    // `default` clause below — the two are unrelated despite sharing a name.
    switch (inset ?? DEFAULT_SCREEN_INSET) {
      case 'device':
        return React.createElement(ScreenInsetArea as any, { key }, React.createElement(ui as any))
      case 'interactable':
        return React.createElement(InteractableArea as any, { key }, React.createElement(ui as any))
      // 'none' — the whole screen, no wrapper entity
      default:
        return React.createElement(ui as any, { key })
    }
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

    for (const [entity, entry] of textureRenderers) {
      if (engine.getEntityState(entity) === EntityState.Removed) {
        destroyTextureRenderer(entity)
      } else {
        entry.renderer.update(React.createElement(entry.ui as any))
      }
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

    const { width, height } = canvasInfo
    const { virtualWidth, virtualHeight } = activeVirtualSize

    // The scale factor is the contain-fit of the design resolution inside the canvas,
    // and nothing else.
    //
    // devicePixelRatio is deliberately absent. It is a density hint — "how many physical
    // pixels per canvas unit", for picking a 1x/2x/3x asset — not a layout unit, the same
    // role it has in CSS and React Native, where it is exposed but never enters layout.
    // Dividing by it made UI size inversely proportional to a quantity the scene author
    // does not control and that measures something different on every renderer: panel
    // density on mobile, OS display scaling on web, display/window on native desktop.
    const nextScale = Math.min(width / virtualWidth, height / virtualHeight)
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
      for (const entity of textureRenderers.keys()) {
        destroyTextureRenderer(entity)
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
    },
    setTextureRenderer(entity: Entity, ui: UiComponent) {
      destroyTextureRenderer(entity)
      textureRenderers.set(entity, { renderer: createReconciler(engine, pointerSystem, entity), ui })
    },
    removeTextureRenderer(entity: Entity) {
      destroyTextureRenderer(entity)
    }
  }
}
