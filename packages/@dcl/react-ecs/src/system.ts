import type { IEngine, PointerEventsSystem } from '@dcl/ecs'
import React from 'react'
import type { ReactEcs } from './react-ecs'
import { createReconciler } from './reconciler'

/**
 * @public
 */
export type UiComponent = () => ReactEcs.JSX.ReactNode

/**
 * @public
 */
export interface ReactBasedUiSystem {
  destroy(): void
  setUiRenderer(ui: UiComponent): void
  /**
   * Add a UI renderer with a unique key. If a renderer with the same key already exists, it will be replaced.
   * This allows dynamically adding UI structures that are rendered alongside the main UI set via setUiRenderer.
   * @param key - Unique identifier for the UI renderer
   * @param ui - The UI component to render
   */
  addUiRenderer(key: string, ui: UiComponent): void
  /**
   * Remove a previously added UI renderer by its key.
   * @param key - The unique identifier of the UI renderer to remove
   */
  removeUiRenderer(key: string): void
}

/**
 * @public
 */
export function createReactBasedUiSystem(engine: IEngine, pointerSystem: PointerEventsSystem): ReactBasedUiSystem {
  const renderer = createReconciler(engine, pointerSystem)
  let uiComponent: UiComponent | undefined = undefined
  const additionalRenderers = new Map<string, UiComponent>()

  function ReactBasedUiSystem() {
    const components: React.ReactNode[] = []

    // Add main UI component if set
    if (uiComponent) {
      components.push(React.createElement(uiComponent as any, { key: '__main__' }))
    }

    // Add all additional UI renderers
    for (const [key, component] of additionalRenderers) {
      components.push(React.createElement(component as any, { key }))
    }

    // Only render if there are components to render
    if (components.length > 0) {
      renderer.update(React.createElement(React.Fragment, null, ...components))
    }
  }

  engine.addSystem(ReactBasedUiSystem, 100e3, '@dcl/react-ecs')

  return {
    destroy() {
      engine.removeSystem(ReactBasedUiSystem)
      for (const entity of renderer.getEntities()) {
        engine.removeEntity(entity)
      }
    },
    setUiRenderer(ui: UiComponent) {
      uiComponent = ui
    },
    addUiRenderer(key: string, ui: UiComponent) {
      additionalRenderers.set(key, ui)
    },
    removeUiRenderer(key: string) {
      additionalRenderers.delete(key)
    }
  }
}
