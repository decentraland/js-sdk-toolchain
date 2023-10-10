import { EasingFunction, Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated Tween ProtoBuf', () => {
  const start = { x: 0, y: 0, z: 0 }
  const end = { x: 8, y: 8, z: 8 }
  it('should serialize/deserialize move Tween', () => {
    const newEngine = Engine()
    const Tween = components.Tween(newEngine)

    testComponentSerialization(Tween, {
      duration: 1,
      easingFunction: EasingFunction.EF_LINEAR,
      mode: Tween.Mode.Move({ start, end, faceDirection: false }),
      playing: false,
      currentTime: 0
    })

    testComponentSerialization(Tween, {
      duration: 1,
      easingFunction: EasingFunction.EF_LINEAR,
      mode: Tween.Mode.Scale({ start, end }),
      playing: true,
      currentTime: 1
    })

    testComponentSerialization(Tween, {
      duration: 1,
      easingFunction: EasingFunction.EF_LINEAR,
      mode: Tween.Mode.Rotate({ start: { ...start, w: 0 }, end: { ...end, w: 8 } }),
      playing: false,
      currentTime: 0
    })
  })
})
