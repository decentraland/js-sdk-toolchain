import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated LightSource ProtoBuf', () => {
  it('should serialize/deserialize Point LightSource', () => {
    const newEngine = Engine()
    const LightSource = components.LightSource(newEngine)

    testComponentSerialization(LightSource, {
      active: true,
      color: { r: 1, g: 1, b: 1 },
      intensity: 1,
      range: 10,
      shadowMaskTexture: undefined,
      shadow: true,
      type: { $case: 'point', point: {} }
    })
  })

  it('should serialize/deserialize Spot LightSource', () => {
    const newEngine = Engine()
    const LightSource = components.LightSource(newEngine)

    testComponentSerialization(LightSource, {
      active: false,
      color: { r: 1, g: 1, b: 1 },
      intensity: 1,
      range: 10,
      shadowMaskTexture: undefined,
      shadow: true,
      type: {
        $case: 'spot',
        spot: {
          innerAngle: 21.8,
          outerAngle: 30
        }
      }
    })
  })
})
