import type { Entity, EntityState, IEngine, PointerEventsSystem } from '@dcl/ecs'
import React from 'react'
import type { ReactEcs } from './react-ecs'
import { createReconciler } from './reconciler'

/**
 * @public
 */
export type UiComponent = () => ReactEcs.JSX.ReactNode

/**
 * Options for addUiRenderer
 * @public
 */
export interface AddUiRendererOptions {
  /**
   * Optional unique identifier for the UI renderer.
   * If not provided, a unique key will be auto-generated and returned.
   */
  key?: string
  /**
   * Optional entity to associate with this UI renderer.
   * When the entity is removed, the UI renderer will be automatically cleaned up.
   * Defaults to engine.RootEntity if not provided.
   */
  entity?: Entity
}

/**
 * @public
 */
export interface ReactBasedUiSystem {
  destroy(): void
  setUiRenderer(ui: UiComponent): void
  /**
   * Add a UI renderer that will be rendered alongside the main UI set via setUiRenderer.
   *
   * @param ui - The UI component to render
   * @param options - Optional configuration:
   *   - key: Unique identifier. If not provided, one will be auto-generated.
   *   - entity: Entity to associate with this renderer. When the entity is removed,
   *             the UI renderer is automatically cleaned up. Defaults to engine.RootEntity.
   * @returns The key (provided or auto-generated) that can be used with removeUiRenderer
   *
   * @example
   * ```ts
   * // Simple usage - auto-generated key, bound to RootEntity
   * const key = ReactEcsRenderer.addUiRenderer(myUi)
   *
   * // With explicit key
   * ReactEcsRenderer.addUiRenderer(myUi, { key: 'notifications' })
   *
   * // Smart item with auto-cleanup when entity is removed
   * ReactEcsRenderer.addUiRenderer(myUi, { entity: smartItemEntity })
   * ```
   */
  addUiRenderer(ui: UiComponent, options?: AddUiRendererOptions): string
  /**
   * Remove a previously added UI renderer by its key.
   * @param key - The unique identifier of the UI renderer to remove
   */
  removeUiRenderer(key: string): void
}

// Entity state enum value for removed entities
const ENTITY_STATE_REMOVED = 2 // EntityState.Removed

/**
 * @public
 */
export function createReactBasedUiSystem(engine: IEngine, pointerSystem: PointerEventsSystem): ReactBasedUiSystem {
  const renderer = createReconciler(engine, pointerSystem)
  let uiComponent: UiComponent | undefined = undefined
  const additionalRenderers = new Map<string, { ui: UiComponent; entity: Entity }>()
  let keyCounter = 0

  function generateKey(): string {
    return `__ui_renderer_${keyCounter++}`
  }

  function ReactBasedUiSystem() {
    // Check for entity-based cleanup - collect keys first to avoid modifying map during iteration
    const keysToRemove: string[] = []
    for (const [key, { entity }] of additionalRenderers) {
      if (engine.getEntityState(entity) === ENTITY_STATE_REMOVED) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      additionalRenderers.delete(key)
    }

    const components: React.ReactNode[] = []

    // Add main UI component if set
    if (uiComponent) {
      components.push(React.createElement(uiComponent as any, { key: '__main__' }))
    }

    // Add all additional UI renderers
    for (const [key, { ui }] of additionalRenderers) {
      components.push(React.createElement(ui as any, { key }))
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
    addUiRenderer(ui: UiComponent, options?: AddUiRendererOptions): string {
      const key = options?.key ?? generateKey()
      const entity = options?.entity ?? engine.RootEntity
      additionalRenderers.set(key, { ui, entity })
      return key
    },
    removeUiRenderer(key: string) {
      additionalRenderers.delete(key)
    }
  }
}
