import { Engine, components, PBEnvironmentFog } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated EnvironmentFog ProtoBuf', () => {
  it('should serialize/deserialize EnvironmentFog with all fields undefined', () => {
    const newEngine = Engine()
    const EnvironmentFog = components.EnvironmentFog(newEngine)

    testComponentSerialization<PBEnvironmentFog>(EnvironmentFog, {
      color: undefined,
      density: undefined
    })
  })

  it('should serialize/deserialize EnvironmentFog with color and density set using a multi-key gradient', () => {
    const newEngine = Engine()
    const EnvironmentFog = components.EnvironmentFog(newEngine)

    testComponentSerialization<PBEnvironmentFog>(EnvironmentFog, {
      color: {
        keys: [
          { time: 0.75, color: { r: 2.5, g: 0.1, b: 0.2, a: 1 } },
          { time: 0.1, color: { r: 0, g: 0, b: 0, a: 1 } },
          { time: 0.4, color: { r: 1, g: 1, b: 1, a: 0.5 } }
        ]
      },
      density: 0.02
    })
  })

  it('should serialize/deserialize EnvironmentFog with a single-key gradient (constant color)', () => {
    const newEngine = Engine()
    const EnvironmentFog = components.EnvironmentFog(newEngine)

    testComponentSerialization<PBEnvironmentFog>(EnvironmentFog, {
      color: { keys: [{ time: 0.5, color: { r: 0.2, g: 0.4, b: 0.6, a: 1 } }] },
      density: undefined
    })
  })

  it('should serialize/deserialize EnvironmentFog with an empty-keys gradient (unset gradient)', () => {
    const newEngine = Engine()
    const EnvironmentFog = components.EnvironmentFog(newEngine)

    testComponentSerialization<PBEnvironmentFog>(EnvironmentFog, {
      color: { keys: [] },
      density: undefined
    })
  })

  it('should serialize/deserialize EnvironmentFog with only density set (color undefined)', () => {
    const newEngine = Engine()
    const EnvironmentFog = components.EnvironmentFog(newEngine)

    testComponentSerialization<PBEnvironmentFog>(EnvironmentFog, {
      color: undefined,
      density: 0.0005
    })
  })

  it('should serialize/deserialize EnvironmentFog with a negative density', () => {
    const newEngine = Engine()
    const EnvironmentFog = components.EnvironmentFog(newEngine)

    testComponentSerialization<PBEnvironmentFog>(EnvironmentFog, {
      color: undefined,
      density: -1
    })
  })
})
