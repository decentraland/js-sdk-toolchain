import {
  Engine,
  components,
  PBLightSource,
  PBLightSource_Point,
  PBLightSource_Spot
} from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

function createPointLight(point: PBLightSource_Point): PBLightSource {
  const test : PBLightSource = {
    type: {
      $case: 'spot',
      spot: {
        active: true,
        color: { r: 1, g: 1, b: 1 },
        intensity: 1,
        range: 10,
        shadowMaskTexture: undefined,
        shadow: true,
        innerAngle: 21.8,
        outerAngle: 30
      }
    }
  }

  return {
    type: {
      $case: 'point',
      point
    }
  }
}

function createSpotLight(spot: PBLightSource_Spot): PBLightSource {
  return {
    type: {
      $case: 'spot',
      spot
    }
  }
}

describe('Generated LightSource ProtoBuf', () => {
  it('should serialize/deserialize Point LightSource', () => {
    const newEngine = Engine()
    const LightSource = components.LightSource(newEngine)

    testComponentSerialization(
      LightSource,
      createPointLight({
        active: true,
        color: { r: 1, g: 1, b: 1 },
        intensity: 1,
        range: 10,
        shadowMaskTexture: undefined,
        shadow: true
      })
    )
  })

  it('should serialize/deserialize Spot LightSource', () => {
    const newEngine = Engine()
    const LightSource = components.LightSource(newEngine)

    testComponentSerialization(
      LightSource,
      createSpotLight({
        active: true,
        color: { r: 1, g: 1, b: 1 },
        intensity: 1,
        range: 10,
        shadowMaskTexture: undefined,
        shadow: true,
        innerAngle: 21.8,
        outerAngle: 30
      })
    )
  })
})
