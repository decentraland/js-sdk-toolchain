import { IEngine, engine, Tween, SyncComponents } from '@dcl/ecs'
import { Schemas } from '@dcl/ecs/dist/schemas'

/**
 * Initializes the automatic tween synchronization system
 *
 * @param engineInstance - The ECS engine instance to use
 * @param isServer - Whether this instance is the server/authority
 */
export function initTweenSync(engineInstance: IEngine = engine, isServer: boolean): void {
  // Create our internal TweenSync component - not exposed to users
  const TweenSync = engineInstance.defineComponent('tweenSync', {
    startTime: Schemas.Number
  })

  // Track newly created tweens on server
  if (isServer) {
    engineInstance.addSystem(() => {
      // Find all entities with tweens but no TweenSync component
      for (const [entity] of engineInstance.getEntitiesWith(Tween)) {
        // Skip if this tween already has a TweenSync component
        if (TweenSync.has(entity)) continue

        // Store the creation time
        TweenSync.createOrReplace(entity, {
          startTime: Date.now()
        })

        // Sync both components to clients
        const syncComponents = SyncComponents.getMutable(entity)
        syncComponents.componentIds = [...syncComponents.componentIds, TweenSync.componentId]
      }

      // Find entities that have a TweenSync but no Tween
      for (const [entity] of engineInstance.getEntitiesWith(TweenSync)) {
        if (!Tween.has(entity)) {
          // If the tween was removed, also remove the sync component
          TweenSync.deleteFrom(entity)
        }
      }
    })
  }

  // System that runs on all clients to handle tween synchronization
  engineInstance.addSystem(() => {
    // Process all entities that have both Tween and TweenSync components
    for (const [entity, tween, tweenSync] of engineInstance.getEntitiesWith(Tween, TweenSync)) {
      // Skip if there's no tween mode
      if (!tween.mode) continue

      // Calculate elapsed time
      const now = Date.now()
      const elapsedTime = (now - tweenSync.startTime) / 1000 // Convert to seconds
      const elapsedNormalized = Math.min(1, elapsedTime / tween.duration) // Normalize to 0-1 range, capped at 1

      // If the tween should be complete based on elapsed time, remove the sync component
      if (elapsedTime >= tween.duration) {
        if (isServer) {
          TweenSync.deleteFrom(entity)
          Tween.deleteFrom(entity)
        }
        continue
      }

      // If we're on a client and this tween needs adjustment
      if (!isServer && elapsedTime > 0 && (!tween.currentTime || tween.currentTime < elapsedNormalized)) {
        // Create a new tween with the same parameters but with adjusted currentTime
        Tween.createOrReplace(entity, {
          ...tween,
          // Set the current time to match where we should be (normalized 0-1 value)
          currentTime: elapsedNormalized
        })
      }
    }
  })
}
