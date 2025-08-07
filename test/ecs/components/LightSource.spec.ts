import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'
import { PBLightSource, PBLightSource_Point, LightSource } from "../../../packages/@dcl/ecs";

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

  it('should test point light helper', () => {
    const newEngine = Engine()
    const LightSource = components.LightSource(newEngine)
    const entity = newEngine.addEntity()

    expect(LightSource.getOrNull(entity)).toBeNull()

    LightSource.create(entity, {
      active: true,
      color: { r: 1, g: 1, b: 1 },
      intensity: 1,
      range: 10,
      shadowMaskTexture: undefined,
      shadow: true,
      type: LightSource.Type.Point({})
    })

    expect(LightSource.get(entity)).toStrictEqual<PBLightSource>({
      active: true,
      color: { r: 1, g: 1, b: 1 },
      intensity: 1,
      range: 10,
      shadowMaskTexture: undefined,
      shadow: true,
      type: { $case: 'point', point: {} }
    })
  })

  it('should test spot light helper', () => {
    const newEngine = Engine()
    const LightSource = components.LightSource(newEngine)
    const entity = newEngine.addEntity()

    expect(LightSource.getOrNull(entity)).toBeNull()

    LightSource.create(entity, {
      active: false,
      color: { r: 1, g: 1, b: 1 },
      intensity: 1,
      range: 10,
      shadowMaskTexture: undefined,
      shadow: true,
      type: LightSource.Type.Spot({
        innerAngle: 21.8,
        outerAngle: 30,
      })
    })

    expect(LightSource.get(entity)).toStrictEqual<PBLightSource>({
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
