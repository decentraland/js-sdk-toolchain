import { Tween as _Tween, SyncedClock as _SyncedClock, TweenState as _TweenState, IEngine } from '@dcl/ecs'

/**
 * This system ensures that all Tween components are properly synchronized across the network
 * by setting their startSyncedTimestamp using the global SyncedClock value.
 *
 * The system runs at the end of each frame to ensure that every tween
 * is synchronized before sending that value to the client/network
 *
 * For tweens that have already started (have a TweenState with currentTime > 0),
 * it calculates how much time has elapsed and subtracts it from the current syncedTimestamp
 * to determine when the tween actually started.
 *
 * The system only processes tweens when:
 * 1. The SyncedClock component exists and is synchronized (status = SS_SYNCHRONIZED)
 * 2. The scene's network communications are initialized (isStateSyncronized = true)
 *
 * @param engine - The ECS engine instance
 * @param isStateSyncronized - Function that returns whether network comms are ready
 */
export function createTweenSyncSystem(engine: IEngine, isStateSyncronized: () => boolean) {
  console.log('[BOEDO] createTweenSyncSystem')

  // Get component definitions from the engine using their componentIds
  const SyncedClock = engine.getComponent(_SyncedClock.componentId) as typeof _SyncedClock
  const Tween = engine.getComponent(_Tween.componentId) as typeof _Tween
  const TweenState = engine.getComponent(_TweenState.componentId) as typeof _TweenState
  const DEBUG_NETWORK_MESSAGES = () => (globalThis as any).DEBUG_NETWORK_MESSAGES ?? false
  engine.addSystem(() => {
    // Get the current state of the global clock
    const syncedClock = SyncedClock.getOrNull(engine.RootEntity)

    // Only process if we have a synchronized clock and comms are initialized
    if (!syncedClock || !syncedClock.syncedTimestamp || syncedClock.status !== 2 || !isStateSyncronized()) {
      return
    }
    // Iterate through all entities with Tween component
    for (const [entity, tween] of engine.getEntitiesWith(Tween)) {
      const tweenState = TweenState.getOrNull(entity)

      // If the tween doesn't have a startSyncedTimestamp, set it
      if (tween.startSyncedTimestamp === undefined) {
        // If the tween has already started, we need to account for the elapsed time
        if (tweenState && tweenState.currentTime > 0) {
          // Convert currentTime from normalized [0-1] to milliseconds
          const elapsedMs = tweenState.currentTime * tween.duration
          // Subtract the elapsed time from current syncedTimestamp to get the actual start time
          DEBUG_NETWORK_MESSAGES() &&
            console.log(
              'Updating tween with startSyncedTimestamp - elapsedMs',
              (syncedClock?.syncedTimestamp ?? 0) - elapsedMs,
              elapsedMs,
              '-.'
            )
          Tween.getMutable(entity).startSyncedTimestamp = (syncedClock?.syncedTimestamp ?? 0) - elapsedMs
        } else {
          // If the tween hasn't started yet, just use the current syncedTimestamp
          DEBUG_NETWORK_MESSAGES() &&
            console.log('Updating tween with startSyncedTimestamp', syncedClock?.syncedTimestamp ?? 0)
          Tween.getMutable(entity).startSyncedTimestamp = syncedClock?.syncedTimestamp ?? 0
        }
      }
    }
  }, Number.NEGATIVE_INFINITY)
}
