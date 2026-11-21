import { IEngine, engine, SyncComponents, AudioSource, VideoPlayer, Schemas } from '@dcl/ecs'

/**
 * Initializes the automatic media synchronization system for Audio and Video
 *
 * @param engineInstance - The ECS engine instance to use
 * @param isServer - Whether this instance is the server/authority
 */
export function initMediaSync(engineInstance: IEngine = engine, isServer: boolean): void {
  // Create our internal sync components - not exposed to users
  const AudioSync = engineInstance.defineComponent('audioSync', {
    startTime: Schemas.Number
  })

  const VideoSync = engineInstance.defineComponent('videoSync', {
    startTime: Schemas.Number
  })

  // Track audio and video on server
  if (isServer) {
    // Handle Audio synchronization
    engineInstance.addSystem(() => {
      // Find all entities with AudioSource
      for (const [entity, audioSource] of engineInstance.getEntitiesWith(AudioSource)) {
        // Skip if not playing
        if (!audioSource.playing) continue

        // Adjust startTime based on current position to maintain sync
        // This handles both initial playback and resume after pause
        if (AudioSync.has(entity)) {
          // If already playing, no need to update
          continue
        }

        // New audio or resumed audio, set startTime to now minus the current position
        // This ensures proper sync
        AudioSync.createOrReplace(entity, {
          startTime: Date.now()
        })

        // Sync to clients
        const syncComponents = SyncComponents.getMutable(entity)
        syncComponents.componentIds = [...syncComponents.componentIds, AudioSync.componentId]
      }

      // Find entities where audio stopped playing
      for (const [entity] of engineInstance.getEntitiesWith(AudioSync)) {
        if (!AudioSource.has(entity) || !AudioSource.get(entity).playing) {
          // If audio was removed or stopped playing, remove sync component
          AudioSync.deleteFrom(entity)
        }
      }
    })

    // Handle Video synchronization
    engineInstance.addSystem(() => {
      // Find all entities with VideoPlayer
      for (const [entity, videoPlayer] of engineInstance.getEntitiesWith(VideoPlayer)) {
        // Skip if not playing
        if (!videoPlayer.playing) continue

        // Adjust startTime based on current position to maintain sync
        // This handles both initial playback and resume after pause
        if (VideoSync.has(entity)) {
          // If already playing, no need to update
          continue
        }

        // New video or resumed video, set startTime to now minus the current position
        // This ensures proper sync
        VideoSync.createOrReplace(entity, {
          startTime: Date.now()
        })

        // Sync to clients
        const syncComponents = SyncComponents.getMutable(entity)
        syncComponents.componentIds = [...syncComponents.componentIds, VideoSync.componentId]
      }

      // Find entities where video stopped playing
      for (const [entity] of engineInstance.getEntitiesWith(VideoSync)) {
        if (!VideoPlayer.has(entity) || !VideoPlayer.get(entity).playing) {
          // If video was removed or stopped playing, remove sync component
          VideoSync.deleteFrom(entity)
        }
      }
    })
  }

  // System that runs on all clients to handle media playback synchronization
  engineInstance.addSystem(() => {
    // Skip if we're the server
    if (isServer) return

    // Process Audio entities
    for (const [entity, audioSource, audioSync] of engineInstance.getEntitiesWith(AudioSource, AudioSync)) {
      // Calculate elapsed time
      const now = Date.now()
      const elapsedTime = (now - audioSync.startTime) / 1000
      AudioSource.getMutable(entity).currentTime = elapsedTime
    }

    // Process Video entities
    for (const [entity, videoPlayer, videoSync] of engineInstance.getEntitiesWith(VideoPlayer, VideoSync)) {
      // Calculate elapsed time
      const now = Date.now()
      const elapsedTime = (now - videoSync.startTime) / 1000
      VideoPlayer.getMutable(entity).position = elapsedTime
    }
  })
}
