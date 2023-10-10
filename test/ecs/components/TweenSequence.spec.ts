import { EasingFunction, Engine, Tween, TweenLoop, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated TweenSequence ProtoBuf', () => {
  it('should serialize/deserialize move TweenSequence', () => {
    const newEngine = Engine()
    const TweenSequence = components.TweenSequence(newEngine)

    testComponentSerialization(TweenSequence, {
      sequence: [
        {
          duration: 8,
          currentTime: 1,
          playing: true,
          mode: Tween.Mode.Move({ faceDirection: true, start: { x: 0, y: 0, z: 0 }, end: { x: 8, y: 8, z: 8 } }),
          easingFunction: EasingFunction.EF_EASEBACK
        }
      ],
      loop: TweenLoop.TL_RESTART
    })

    testComponentSerialization(TweenSequence, {
      sequence: [
        {
          duration: 8,
          currentTime: 1,
          playing: true,
          mode: Tween.Mode.Scale({ start: { x: 0, y: 0, z: 0 }, end: { x: 8, y: 8, z: 8 } }),
          easingFunction: EasingFunction.EF_EASEBACK
        }
      ],
      loop: TweenLoop.TL_YOYO
    })
  })
})
