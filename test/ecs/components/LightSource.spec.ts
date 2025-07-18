import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated LightSource ProtoBuf', () => {
  it('should serialize/deserialize Point LightSource', () => {
    const newEngine = Engine()
    const LightSource = components.LightSource(newEngine)

    testComponentSerialization(LightSource, {
      shadow: true,
      active: true,
      color: { r: 1, g: 1, b: 1 },
      intensity: 1,
      range: 10
    })
  })

  it('should serialize/deserialize Spot LightSource', () => {
    const newEngine = Engine()
    const LightSource = components.LightSource(newEngine)

    testComponentSerialization(LightSource, {
      type: LightSource.Type.Spot({
        innerAngle: 0,
        outerAngle: 0,
      }),
      shadow: true,
      shadowMaskTexture: undefined,
      active: true,
      color: { r: 1, g: 1, b: 1 },
      intensity: 1,
      range: 10
    })
  })
})
