import { Engine, components, PBSun } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated Sun ProtoBuf', () => {
  it('should serialize/deserialize Sun with all fields undefined', () => {
    const newEngine = Engine()
    const Sun = components.Sun(newEngine)

    testComponentSerialization<PBSun>(Sun, {
      color: undefined,
      visible: undefined,
      intensity: undefined,
      direction: undefined
    })
  })

  it('should serialize/deserialize Sun with all fields set using a multi-key gradient', () => {
    const newEngine = Engine()
    const Sun = components.Sun(newEngine)

    testComponentSerialization<PBSun>(Sun, {
      color: {
        keys: [
          { time: 0.75, color: { r: 2.5, g: 0.1, b: 0.2, a: 1 } },
          { time: 0.1, color: { r: 0, g: 0, b: 0, a: 1 } },
          { time: 0.4, color: { r: 1, g: 1, b: 1, a: 0.5 } }
        ]
      },
      visible: true,
      intensity: 1.5,
      direction: { x: 0, y: -1, z: 0 }
    })
  })

  it('should serialize/deserialize Sun with a single-key gradient (constant color)', () => {
    const newEngine = Engine()
    const Sun = components.Sun(newEngine)

    testComponentSerialization<PBSun>(Sun, {
      color: { keys: [{ time: 0.5, color: { r: 1, g: 0.9, b: 0.7, a: 1 } }] },
      visible: undefined,
      intensity: undefined,
      direction: undefined
    })
  })

  it('should serialize/deserialize Sun with an empty-keys gradient (unset gradient)', () => {
    const newEngine = Engine()
    const Sun = components.Sun(newEngine)

    testComponentSerialization<PBSun>(Sun, {
      color: { keys: [] },
      visible: undefined,
      intensity: undefined,
      direction: undefined
    })
  })

  it('should serialize/deserialize Sun hidden (visible = false, no color)', () => {
    const newEngine = Engine()
    const Sun = components.Sun(newEngine)

    testComponentSerialization<PBSun>(Sun, {
      color: undefined,
      visible: false,
      intensity: undefined,
      direction: undefined
    })
  })

  it('should serialize/deserialize Sun with a negative intensity', () => {
    const newEngine = Engine()
    const Sun = components.Sun(newEngine)

    testComponentSerialization<PBSun>(Sun, {
      color: undefined,
      visible: undefined,
      intensity: -1,
      direction: undefined
    })
  })

  it('should serialize/deserialize Sun with a fixed direction only', () => {
    const newEngine = Engine()
    const Sun = components.Sun(newEngine)

    testComponentSerialization<PBSun>(Sun, {
      color: undefined,
      visible: undefined,
      intensity: undefined,
      direction: { x: 0.5, y: -0.5, z: 0.70710678 }
    })
  })
})
