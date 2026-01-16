import { EntityState, type Entity, type IEngine, type PointerEventsSystem } from '@dcl/ecs'
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
  addUiRenderer(entity: Entity, ui: UiComponent): void
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
  const additionalRenderers = new Map<Entity, UiComponent>()

  function ReactBasedUiSystem() {
    const components: React.ReactNode[] = []

    // Add main UI component
    if (uiComponent) {
      components.push(React.createElement(uiComponent as any, { key: '__main__' }))
    }

    const entitiesToRemove: Entity[] = []
    for (const [entity, component] of additionalRenderers) {
      // Check for entity-based cleanup
      if (engine.getEntityState(entity) === EntityState.Removed) {
        entitiesToRemove.push(entity)
      } else {
        components.push(React.createElement(component as any, { key: `__entity_${entity}__` }))
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
    addUiRenderer(entity: Entity, ui: UiComponent) {
      additionalRenderers.set(entity, ui)
    },
    removeUiRenderer(entity: Entity) {
      additionalRenderers.delete(entity)
    }
  }
}
