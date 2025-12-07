import { Entity, IEngine } from '../../engine'
import { LastWriteWinElementSetComponentDefinition } from '../../engine/component'
import { AudioAnalysis } from '../generated/index.gen'
import { PBAudioAnalysis, PBAudioAnalysisMode } from '../generated/pb/decentraland/sdk/components/audio_analysis.gen'

export interface AudioAnalysisComponentDefinitionExtended
  extends LastWriteWinElementSetComponentDefinition<PBAudioAnalysis> {
  readIntoView(entity: Entity, out: AudioAnalysisView): void

  createAudioAnalysis(
    entity: Entity,
    mode: PBAudioAnalysisMode | undefined, // default is PBAudioAnalysisMode.MODE_LOGARITHMIC
    amplitudeGain: number | undefined,
    bandsGain: number | undefined
  ): void
}

export type AudioAnalysisView = {
  amplitude: number
  bands: number[]
}

export function defineAudioAnalysisComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): AudioAnalysisComponentDefinitionExtended {
  const theComponent = AudioAnalysis(engine)

  return {
    ...theComponent,

    readIntoView(entity: Entity, out: AudioAnalysisView): void {
      const audioAnalysis = theComponent.get(entity)

      out.amplitude = audioAnalysis.amplitude

      out.bands[0] = audioAnalysis.band0
      out.bands[1] = audioAnalysis.band1
      out.bands[2] = audioAnalysis.band2
      out.bands[3] = audioAnalysis.band3
      out.bands[4] = audioAnalysis.band4
      out.bands[5] = audioAnalysis.band5
      out.bands[6] = audioAnalysis.band6
      out.bands[7] = audioAnalysis.band7
    },

    createAudioAnalysis(
      entity: Entity,
      mode: PBAudioAnalysisMode | undefined = PBAudioAnalysisMode.MODE_LOGARITHMIC,
      amplitudeGain: number | undefined = undefined,
      bandsGain: number | undefined = undefined
    ): void {
      const realMode: PBAudioAnalysisMode = mode === undefined ? PBAudioAnalysisMode.MODE_LOGARITHMIC : mode

      theComponent.create(entity, {
        mode: realMode,
        amplitudeGain,
        bandsGain,
        amplitude: 0,
        band0: 0,
        band1: 0,
        band2: 0,
        band3: 0,
        band4: 0,
        band5: 0,
        band6: 0,
        band7: 0
      })
    }
  }
}
