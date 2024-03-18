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
   * Set playing=true the sound `$name`
   * @param entity - entity with AudioSource component
   * @param src - the path to the sound to play
   * @param resetCursor - the sound starts at 0 or continues from the current cursor position
   * @returns true in successful playing, false if it doesn't find the AudioSource component
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
      // Get the mutable to modify
      const audioSource = theComponent.getMutableOrNull(entity)
      if (!audioSource) return false

      audioSource.audioClipUrl = src
      audioSource.playing = true
      audioSource.currentTime = resetCursor ? 0 : audioSource.currentTime

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
