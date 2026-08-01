import { EntityState, type Entity, type IEngine, type PointerEventsSystem } from '@dcl/ecs'
import * as ecsComponents from '@dcl/ecs/dist/components'
import React from 'react'
import type { ReactEcs } from './react-ecs'
import { createReconciler } from './reconciler'
import { InteractableArea, ScreenInsetArea } from './components'
import {
  getUiScaleFactor,
  resetInteractableArea,
  resetScreenInsetArea,
  resetUiScaleFactor,
  setInteractableArea,
  setScreenInsetArea,
  setUiScaleFactor
} from './components/utils'

/**
 * @public
 */
export type UiComponent = () => ReactEcs.JSX.ReactNode

/**
 * @public
 * The area a UI renderer's root is constrained to:
 * - 'none': render as-is, no wrapping (default).
 * - 'screen-inset': wrap in `ScreenInsetArea`, constraining to the device safe area.
 * - 'interactable': wrap in `ScreenInsetArea` and, inside it, `InteractableArea`,
 *   constraining to the HUD-safe zone not covered by client UI.
 */
export type UiRootAreaType = 'none' | 'screen-inset' | 'interactable'

/**
 * @public
 */
export type UiRendererOptions = {
  virtualWidth: number
  virtualHeight: number
  /**
   * Optional root area the rendered ui is constrained to. Defaults to 'none' (no wrapping).
   */
  area?: UiRootAreaType
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
   * `options.area` optionally constrains the rendered ui to a renderer-reported root area.
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
   *                  `options.area` optionally constrains the rendered ui to a renderer-reported root area.
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

  function getActiveVirtualSize(): UiRendererOptions | undefined {
    // Main renderer options win; otherwise use the first additional renderer option.
    if (virtualSize) return virtualSize
    for (const entry of additionalRenderers.values()) {
      if (entry.options) return entry.options
    }
    return undefined
  }

  // Wraps the rendered `ui` in the renderer-reported root area container(s)
  // requested via `options.area`, applying the `key` to the outermost element
  // so the resulting node can be used directly as a child of the components list.
  function buildUiElement(ui: UiComponent, key: string, area?: UiRootAreaType): React.ReactElement {
    if (area === 'screen-inset') {
      return React.createElement(ScreenInsetArea, { key }, React.createElement(ui as any))
    }
    if (area === 'interactable') {
      return React.createElement(
        ScreenInsetArea,
        { key },
        React.createElement(InteractableArea, null, React.createElement(ui as any))
      )
    }
    return React.createElement(ui as any, { key })
  }

  function ReactBasedUiSystem() {
    const components: React.ReactNode[] = []

    // Add main UI component
    if (uiComponent) {
      components.push(buildUiElement(uiComponent, '__main__', virtualSize?.area))
    }

    const entitiesToRemove: Entity[] = []
    for (const [entity, entry] of additionalRenderers) {
      // Check for entity-based cleanup
      if (engine.getEntityState(entity) === EntityState.Removed) {
        entitiesToRemove.push(entity)
      } else {
        components.push(buildUiElement(entry.ui, `__entity_${entity}__`, entry.options?.area))
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

    const activeVirtualSize = getActiveVirtualSize()
    if (!activeVirtualSize) {
      // Reset only if this system owns the scale factor.
      resetUiScaleFactor(uiScaleFactorOwner)
      return
    }

    if (!canvasInfo) return

    const { width, height, devicePixelRatio } = canvasInfo
    const { virtualWidth, virtualHeight } = activeVirtualSize
    if (!virtualWidth || !virtualHeight) return

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
