import { PBAudioAnalysisMode } from '../../../packages/@dcl/ecs/src'
import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated AudioAnalysis ProtoBuf', () => {
  it('should serialize/deserialize AudioSource', () => {
    const newEngine = Engine()
    const AudioAnalysis = components.AudioAnalysis(newEngine)

    testComponentSerialization(AudioAnalysis, {
      mode: PBAudioAnalysisMode.MODE_RAW,

      amplitude: 0,

      amplitudeGain: undefined,
      bandsGain: undefined,

      band0: 0,
      band1: 0,
      band2: 0,
      band3: 0,
      band4: 0,
      band5: 0,
      band6: 0,
      band7: 0
    })

    testComponentSerialization(AudioAnalysis, {
      mode: PBAudioAnalysisMode.MODE_LOGARITHMIC,

      amplitude: 1,

      amplitudeGain: 10,
      bandsGain: 2,

      band0: 0.2,
      band1: 0.5,
      band2: 0.8,
      band3: 0.1,
      band4: 0.52,
      band5: 0.82,
      band6: 0.86,
      band7: 0.35
    })
  })
})
