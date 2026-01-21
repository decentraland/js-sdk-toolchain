import { EntityState, type Entity, type IEngine, type PointerEventsSystem } from '@dcl/ecs'
import * as ecsComponents from '@dcl/ecs/dist/components'
import React from 'react'
import type { ReactEcs } from './react-ecs'
import { createReconciler } from './reconciler'
import { getUiScaleFactor, resetUiScaleFactor, setUiScaleFactor } from './components/utils'

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
 * @public
 */
export interface ReactBasedUiSystem {
  destroy(): void
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
   */
  addUiRenderer(entity: Entity, ui: UiComponent, options?: UiRendererOptions): void
  /**
   * Remove a previously added UI renderer by its associated entity.
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
  const scaleOwner = Symbol('react-ecs-ui-scale')

  function getActiveVirtualSize(): UiRendererOptions | undefined {
    if (virtualSize) return virtualSize
    for (const entry of additionalRenderers.values()) {
      if (entry.options) return entry.options
    }
    return undefined
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
    const activeVirtualSize = getActiveVirtualSize()
    if (!activeVirtualSize) {
      resetUiScaleFactor(scaleOwner)
      return
    }

    const canvasInfo = UiCanvasInformation.getOrNull(engine.RootEntity)
    if (!canvasInfo) return

    const { width, height } = canvasInfo
    const { virtualWidth, virtualHeight } = activeVirtualSize
    if (!virtualWidth || !virtualHeight) return

    const nextScale = Math.min(width / virtualWidth, height / virtualHeight)
    if (Number.isFinite(nextScale) && nextScale !== getUiScaleFactor()) {

      // @ts-ignore
      console.log(`UiScaleSystem() - UiScaleFactor: ${nextScale} / Virtual Screen: ${virtualWidth}x${virtualHeight} / UiCanvasInfo: ${width}x${height}`)

      setUiScaleFactor(nextScale, scaleOwner)
    }
  }

  engine.addSystem(UiScaleSystem, 100e3 + 1, '@dcl/react-ecs-ui-scale')
  engine.addSystem(ReactBasedUiSystem, 100e3, '@dcl/react-ecs')

  return {
    destroy() {
      engine.removeSystem(UiScaleSystem)
      engine.removeSystem(ReactBasedUiSystem)
      resetUiScaleFactor(scaleOwner)
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
