import { Entity, IEngine } from '../../engine'
import { LastWriteWinElementSetComponentDefinition } from '../../engine/component'
import { AudioSource } from '../generated/index.gen'
import { PBAudioSource } from '../generated/pb/decentraland/sdk/components/audio_source.gen'

/**
 * @public
 */
export interface AudioSourceComponentDefinitionExtended
  extends LastWriteWinElementSetComponentDefinition<PBAudioSource> {
  /**
   * @public
   *
   * Play the sound `src` on the given entity. Creates the AudioSource component
   * if it does not yet exist. Always emits a CRDT PUT, so repeated calls with
   * identical parameters reliably retrigger playback.
   * @param entity - target entity (AudioSource will be created if missing)
   * @param src - the path to the sound to play
   * @param resetCursor - the sound starts at 0 or continues from the current cursor position
   * @returns always true; retained for backwards compatibility
   */
  playSound(entity: Entity, src: string, resetCursor?: boolean): boolean

  /**
   * @public
   *
   * Set playing=false all sounds
   * @param entity - entity with AudioSource component
   * @param resetCursor - the sound stops at 0 or at the current cursor position
   * @returns true in successful stopping, false if it doesn't find the AudioSource component
   */
  stopSound(entity: Entity, resetCursor?: boolean): boolean
}

export function defineAudioSourceComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): AudioSourceComponentDefinitionExtended {
  const theComponent = AudioSource(engine)

  return {
    ...theComponent,
    playSound(entity: Entity, src: string, resetCursor: boolean = true): boolean {
      const existing = theComponent.getOrNull(entity)

      theComponent.createOrReplace(entity, {
        ...existing,
        audioClipUrl: src,
        playing: true,
        currentTime: resetCursor ? 0 : existing?.currentTime ?? 0
      })

      return true
    },
    stopSound(entity: Entity, resetCursor: boolean = true): boolean {
      // Get the mutable to modify
      const audioSource = theComponent.getMutableOrNull(entity)
      if (!audioSource) return false

      audioSource.playing = false
      audioSource.currentTime = resetCursor ? 0 : audioSource.currentTime

      return true
    }
  }
}
