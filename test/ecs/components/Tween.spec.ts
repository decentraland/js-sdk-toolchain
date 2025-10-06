import { EasingFunction, Engine, TextureMovementType, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated Tween ProtoBuf', () => {
  const start = { x: 0, y: 0, z: 0 }
  const end = { x: 8, y: 8, z: 8 }
  const start2d = { x: 0, y: 0 }
  const end2d = { x: 8, y: 8 }
  const startQuat = { x: 0, y: 0, z: 0, w: 1 }
  const endQuat = { x: 1, y: 1, z: 1, w: 0 }

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

    testComponentSerialization(Tween, {
      duration: 1,
      easingFunction: EasingFunction.EF_LINEAR,
      mode: Tween.Mode.TextureMove({
        start: { ...start2d },
        end: { ...end2d },
        movementType: TextureMovementType.TMT_OFFSET
      }),
      playing: false,
      currentTime: 0
    })
  })

  it('should create component with setMove helper', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    expect(Tween.getOrNull(entity)).toBe(null)
    Tween.setMove(entity, start, end, 2.5, EasingFunction.EF_EASEINQUAD)

    expect(Tween.getOrNull(entity)).not.toBe(null)
    expect(Tween.get(entity)).toStrictEqual({
      mode: {
        $case: 'move',
        move: {
          start,
          end
        }
      },
      duration: 2.5,
      easingFunction: EasingFunction.EF_EASEINQUAD
    })
  })

  it('should create component with setScale helper', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    Tween.setScale(entity, start, end, 1.5, EasingFunction.EF_EASEOUTQUAD)

    expect(Tween.get(entity)).toStrictEqual({
      mode: {
        $case: 'scale',
        scale: {
          start,
          end
        }
      },
      duration: 1.5,
      easingFunction: EasingFunction.EF_EASEOUTQUAD
    })
  })

  it('should create component with setRotate helper', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    Tween.setRotate(entity, startQuat, endQuat, 3.0, EasingFunction.EF_EASEQUAD)

    expect(Tween.get(entity)).toStrictEqual({
      mode: {
        $case: 'rotate',
        rotate: {
          start: startQuat,
          end: endQuat
        }
      },
      duration: 3.0,
      easingFunction: EasingFunction.EF_EASEQUAD
    })
  })

  it('should create component with setTextureMove helper', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    Tween.setTextureMove(entity, start2d, end2d, 1.0, TextureMovementType.TMT_TILING, EasingFunction.EF_EASEINSINE)

    expect(Tween.get(entity)).toStrictEqual({
      mode: {
        $case: 'textureMove',
        textureMove: {
          start: start2d,
          end: end2d,
          movementType: TextureMovementType.TMT_TILING
        }
      },
      duration: 1.0,
      easingFunction: EasingFunction.EF_EASEINSINE
    })
  })

  it('should create component with setMoveContinuous helper', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    const direction = { x: 1, y: 0, z: 0 }
    const speed = 5.0

    Tween.setMoveContinuous(entity, direction, speed, 10.0)

    expect(Tween.get(entity)).toStrictEqual({
      mode: {
        $case: 'moveContinuous',
        moveContinuous: {
          direction,
          speed
        }
      },
      duration: 10.0,
      easingFunction: EasingFunction.EF_LINEAR
    })
  })

  it('should create component with setRotateContinuous helper', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    const direction = { x: 0, y: 1, z: 0, w: 0 }
    const speed = 2.0

    Tween.setRotateContinuous(entity, direction, speed, 5.0)

    expect(Tween.get(entity)).toStrictEqual({
      mode: {
        $case: 'rotateContinuous',
        rotateContinuous: {
          direction,
          speed
        }
      },
      duration: 5.0,
      easingFunction: EasingFunction.EF_LINEAR
    })
  })

  it('should create component with setTextureMoveContinuous helper', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    const direction = { x: 0.5, y: -0.5 }
    const speed = 1.5

    Tween.setTextureMoveContinuous(entity, direction, speed, TextureMovementType.TMT_OFFSET, 8.0)

    expect(Tween.get(entity)).toStrictEqual({
      mode: {
        $case: 'textureMoveContinuous',
        textureMoveContinuous: {
          direction,
          speed,
          movementType: TextureMovementType.TMT_OFFSET
        }
      },
      duration: 8.0,
      easingFunction: EasingFunction.EF_LINEAR
    })
  })

  it('should use default parameters for helper methods', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    // Test setMove with explicit easing function (no default for this method)
    Tween.setMove(entity, start, end, 1.0, EasingFunction.EF_LINEAR)
    expect(Tween.get(entity).easingFunction).toBe(EasingFunction.EF_LINEAR)

    // Test setMoveContinuous with explicit duration
    const direction = { x: 1, y: 0, z: 0 }
    Tween.setMoveContinuous(entity, direction, 2.0, 0)
    expect(Tween.get(entity).duration).toBe(0)

    // Test setTextureMove with explicit movement type and easing function
    Tween.setTextureMove(entity, start2d, end2d, 1.0, TextureMovementType.TMT_OFFSET, EasingFunction.EF_LINEAR)
    expect(Tween.get(entity).mode).toStrictEqual({
      $case: 'textureMove',
      textureMove: {
        start: start2d,
        end: end2d,
        movementType: TextureMovementType.TMT_OFFSET
      }
    })

    // Test setTextureMoveContinuous with explicit movement type and duration
    Tween.setTextureMoveContinuous(entity, { x: 1, y: 1 }, 3.0, TextureMovementType.TMT_OFFSET, 0)
    const component = Tween.get(entity)
    expect(component.duration).toBe(0)
    expect(component.mode).toStrictEqual({
      $case: 'textureMoveContinuous',
      textureMoveContinuous: {
        direction: { x: 1, y: 1 },
        speed: 3.0,
        movementType: TextureMovementType.TMT_OFFSET
      }
    })
  })

  it('should replace existing component when using helpers', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    // Create initial component
    Tween.setMove(entity, start, end, 1.0, EasingFunction.EF_LINEAR)
    const initialComponent = Tween.get(entity)
    expect(initialComponent.mode?.$case).toBe('move')

    // Replace with different tween type
    Tween.setScale(entity, { x: 1, y: 1, z: 1 }, { x: 2, y: 2, z: 2 }, 2.0, EasingFunction.EF_EASEINQUAD)
    const replacedComponent = Tween.get(entity)
    expect(replacedComponent.mode?.$case).toBe('scale')
    expect(replacedComponent.duration).toBe(2.0)
    expect(replacedComponent.easingFunction).toBe(EasingFunction.EF_EASEINQUAD)

    // Replace with continuous mode
    const direction = { x: 0, y: 1, z: 0 }
    Tween.setMoveContinuous(entity, direction, 5.0, 10.0)
    const continuousComponent = Tween.get(entity)
    expect(continuousComponent.mode?.$case).toBe('moveContinuous')
    expect(continuousComponent.duration).toBe(10.0)
  })
})
