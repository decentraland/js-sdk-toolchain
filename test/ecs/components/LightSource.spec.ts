import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated LightSource ProtoBuf', () => {
  it('should serialize/deserialize Point LightSource', () => {
    const newEngine = Engine()
    const LightSource = components.LightSource(newEngine)

    testComponentSerialization(LightSource, {
      type: LightSource.Type.Point({}),
      active: true,
      color: { r: 1, g: 1, b: 1 },
      brightness: 1,
      range: 10,
      shadow: components.PBLightSource_ShadowType.ST_NONE
    })
  })

  it('should serialize/deserialize Spot LightSource', () => {
    const newEngine = Engine()
    const LightSource = components.LightSource(newEngine)

    testComponentSerialization(LightSource, {
      type: LightSource.Type.Spot({
        innerAngle: 0,
        outerAngle: 0
      }),
      active: true,
      color: { r: 1, g: 1, b: 1 },
      brightness: 1,
      range: 10,
      shadow: components.PBLightSource_ShadowType.ST_NONE
    })
  })
})
