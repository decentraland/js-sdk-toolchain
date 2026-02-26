import { EasingFunction, Engine, TextureMovementType, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated Tween ProtoBuf', () => {
  const start = { x: 0, y: 0, z: 0 }
  const end = { x: 8, y: 8, z: 8 }
  const start2d = { x: 0, y: 0 }
  const end2d = { x: 8, y: 8 }
  const startQuat = { x: 0, y: 0, z: 0, w: 1 }
  const endQuat = { x: 1, y: 1, z: 1, w: 0 }

  it('should serialize/deserialize all Tween modes', () => {
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

    // Test continuous modes
    testComponentSerialization(Tween, {
      duration: 2,
      easingFunction: EasingFunction.EF_LINEAR,
      mode: Tween.Mode.MoveContinuous({
        direction: { x: 1, y: 0, z: 0 },
        speed: 5.0
      }),
      playing: true,
      currentTime: 1.5
    })

    testComponentSerialization(Tween, {
      duration: 0,
      easingFunction: EasingFunction.EF_LINEAR,
      mode: Tween.Mode.RotateContinuous({
        direction: { x: 0, y: 1, z: 0, w: 0 },
        speed: 2.5
      }),
      playing: false,
      currentTime: 0
    })

    testComponentSerialization(Tween, {
      duration: 10,
      easingFunction: EasingFunction.EF_LINEAR,
      mode: Tween.Mode.TextureMoveContinuous({
        direction: { x: 0.5, y: -0.3 },
        speed: 1.2,
        movementType: TextureMovementType.TMT_TILING
      }),
      playing: true,
      currentTime: 3.7
    })

    testComponentSerialization(Tween, {
      duration: 2000,
      easingFunction: EasingFunction.EF_EASEINQUAD,
      mode: Tween.Mode.MoveRotateScale({
        positionStart: start,
        positionEnd: end,
        rotationStart: startQuat,
        rotationEnd: endQuat,
        scaleStart: start,
        scaleEnd: end
      }),
      playing: true,
      currentTime: 0
    })

    testComponentSerialization(Tween, {
      duration: 0,
      easingFunction: EasingFunction.EF_LINEAR,
      mode: Tween.Mode.MoveRotateScaleContinuous({
        positionDirection: { x: 0, y: 1, z: 0 },
        rotationDirection: { x: 0, y: 0, z: 0, w: 1 },
        scaleDirection: { x: 0, y: 0, z: 0 },
        speed: 90
      }),
      playing: true,
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
      easingFunction: EasingFunction.EF_EASEINQUAD,
      playing: true
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
      easingFunction: EasingFunction.EF_EASEOUTQUAD,
      playing: true
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
      easingFunction: EasingFunction.EF_EASEQUAD,
      playing: true
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
      easingFunction: EasingFunction.EF_EASEINSINE,
      playing: true
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
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
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
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
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
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
    })
  })

  it('should create component with setMoveRotateScale helper', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    const posStart = { x: 0, y: 0, z: 0 }
    const posEnd = { x: 5, y: 3, z: 0 }
    const rotStart = { x: 0, y: 0, z: 0, w: 1 }
    const rotEnd = { x: 0, y: 0.7071, z: 0, w: 0.7071 }
    const scaleStart = { x: 1, y: 1, z: 1 }
    const scaleEnd = { x: 2, y: 2, z: 2 }

    Tween.setMoveRotateScale(entity, {
      position: { start: posStart, end: posEnd },
      rotation: { start: rotStart, end: rotEnd },
      scale: { start: scaleStart, end: scaleEnd },
      duration: 2000,
      easingFunction: EasingFunction.EF_EASEINQUAD
    })

    expect(Tween.get(entity)).toStrictEqual({
      mode: {
        $case: 'moveRotateScale',
        moveRotateScale: {
          positionStart: posStart,
          positionEnd: posEnd,
          rotationStart: rotStart,
          rotationEnd: rotEnd,
          scaleStart: scaleStart,
          scaleEnd: scaleEnd
        }
      },
      duration: 2000,
      easingFunction: EasingFunction.EF_EASEINQUAD,
      playing: true
    })
  })

  it('should create component with setMoveRotateScale helper using default easing', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    const posStart = { x: 0, y: 0, z: 0 }
    const posEnd = { x: 1, y: 1, z: 1 }
    const rotStart = { x: 0, y: 0, z: 0, w: 1 }
    const rotEnd = { x: 0, y: 1, z: 0, w: 0 }
    const scaleStart = { x: 1, y: 1, z: 1 }
    const scaleEnd = { x: 3, y: 3, z: 3 }

    Tween.setMoveRotateScale(entity, {
      position: { start: posStart, end: posEnd },
      rotation: { start: rotStart, end: rotEnd },
      scale: { start: scaleStart, end: scaleEnd },
      duration: 1500
    })

    const result = Tween.get(entity)
    expect(result.easingFunction).toBe(EasingFunction.EF_LINEAR)
    expect(result.duration).toBe(1500)
    expect(result.playing).toBe(true)
    expect(result.mode?.$case).toBe('moveRotateScale')
  })

  it('should create component with setMoveRotateScale with only position', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    const posStart = { x: 0, y: 0, z: 0 }
    const posEnd = { x: 5, y: 0, z: 0 }

    Tween.setMoveRotateScale(entity, {
      position: { start: posStart, end: posEnd },
      duration: 1000
    })

    const result = Tween.get(entity)
    expect(result.mode?.$case).toBe('moveRotateScale')
    if (result.mode?.$case === 'moveRotateScale') {
      expect(result.mode.moveRotateScale.positionStart).toStrictEqual(posStart)
      expect(result.mode.moveRotateScale.positionEnd).toStrictEqual(posEnd)
      expect(result.mode.moveRotateScale.rotationStart).toBeUndefined()
      expect(result.mode.moveRotateScale.rotationEnd).toBeUndefined()
      expect(result.mode.moveRotateScale.scaleStart).toBeUndefined()
      expect(result.mode.moveRotateScale.scaleEnd).toBeUndefined()
    }
    expect(result.duration).toBe(1000)
  })

  it('should create component with setMoveRotateScale with only rotation and scale', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    const rotStart = { x: 0, y: 0, z: 0, w: 1 }
    const rotEnd = { x: 0, y: 0.7071, z: 0, w: 0.7071 }
    const scaleStart = { x: 1, y: 1, z: 1 }
    const scaleEnd = { x: 2, y: 2, z: 2 }

    Tween.setMoveRotateScale(entity, {
      rotation: { start: rotStart, end: rotEnd },
      scale: { start: scaleStart, end: scaleEnd },
      duration: 500,
      easingFunction: EasingFunction.EF_EASEINQUAD
    })

    const result = Tween.get(entity)
    expect(result.mode?.$case).toBe('moveRotateScale')
    if (result.mode?.$case === 'moveRotateScale') {
      expect(result.mode.moveRotateScale.positionStart).toBeUndefined()
      expect(result.mode.moveRotateScale.positionEnd).toBeUndefined()
      expect(result.mode.moveRotateScale.rotationStart).toStrictEqual(rotStart)
      expect(result.mode.moveRotateScale.rotationEnd).toStrictEqual(rotEnd)
      expect(result.mode.moveRotateScale.scaleStart).toStrictEqual(scaleStart)
      expect(result.mode.moveRotateScale.scaleEnd).toStrictEqual(scaleEnd)
    }
    expect(result.duration).toBe(500)
    expect(result.easingFunction).toBe(EasingFunction.EF_EASEINQUAD)
  })

  it('should throw when setMoveRotateScale is called without position, rotation, or scale', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    expect(() => {
      Tween.setMoveRotateScale(entity, { duration: 1000 })
    }).toThrow('setMoveRotateScale: at least one of position, rotation, or scale must be provided')
  })

  it('should throw when setMoveRotateScale has invalid duration', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    expect(() => {
      Tween.setMoveRotateScale(entity, {
        position: { start: { x: 0, y: 0, z: 0 }, end: { x: 1, y: 1, z: 1 } },
        duration: -1
      })
    }).toThrow('setMoveRotateScale: duration must be a non-negative finite number')
  })

  it('should create component with setMoveRotateScaleContinuous with only position', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    const posDir = { x: 1, y: 0, z: 0 }

    Tween.setMoveRotateScaleContinuous(entity, {
      position: { direction: posDir },
      speed: 3.0,
      duration: 2000
    })

    const result = Tween.get(entity)
    expect(result.mode?.$case).toBe('moveRotateScaleContinuous')
    if (result.mode?.$case === 'moveRotateScaleContinuous') {
      expect(result.mode.moveRotateScaleContinuous.positionDirection).toStrictEqual(posDir)
      expect(result.mode.moveRotateScaleContinuous.rotationDirection).toBeUndefined()
      expect(result.mode.moveRotateScaleContinuous.scaleDirection).toBeUndefined()
      expect(result.mode.moveRotateScaleContinuous.speed).toBe(3.0)
    }
    expect(result.duration).toBe(2000)
  })

  it('should throw when setMoveRotateScaleContinuous is called without position, rotation, or scale', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    expect(() => {
      Tween.setMoveRotateScaleContinuous(entity, { speed: 1.0 })
    }).toThrow(
      'setMoveRotateScaleContinuous: at least one of position, rotation, or scale must be provided'
    )
  })

  it('should throw when setMoveRotateScaleContinuous has invalid duration', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    expect(() => {
      Tween.setMoveRotateScaleContinuous(entity, {
        position: { direction: { x: 1, y: 0, z: 0 } },
        speed: 1.0,
        duration: -100
      })
    }).toThrow('setMoveRotateScaleContinuous: duration must be a non-negative finite number')
  })

  it('should create component with setMoveRotateScaleContinuous helper', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    const posDir = { x: 0, y: 1, z: 0 }
    const rotDir = { x: 0, y: 0, z: 0, w: 1 }
    const scaleDir = { x: 0, y: 0, z: 0 }
    const speed = 90

    Tween.setMoveRotateScaleContinuous(entity, {
      position: { direction: posDir },
      rotation: { direction: rotDir },
      scale: { direction: scaleDir },
      speed,
      duration: 5000
    })

    expect(Tween.get(entity)).toStrictEqual({
      mode: {
        $case: 'moveRotateScaleContinuous',
        moveRotateScaleContinuous: {
          positionDirection: posDir,
          rotationDirection: rotDir,
          scaleDirection: scaleDir,
          speed
        }
      },
      duration: 5000,
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
    })
  })

  it('should create component with setMoveRotateScaleContinuous helper using default duration', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    const posDir = { x: 1, y: 0, z: 0 }
    const rotDir = { x: 0, y: 0, z: 0.3827, w: 0.9239 }
    const scaleDir = { x: 0.1, y: 0.1, z: 0.1 }

    Tween.setMoveRotateScaleContinuous(entity, {
      position: { direction: posDir },
      rotation: { direction: rotDir },
      scale: { direction: scaleDir },
      speed: 2.5
    })

    const result = Tween.get(entity)
    expect(result.duration).toBe(0)
    expect(result.easingFunction).toBe(EasingFunction.EF_LINEAR)
    expect(result.playing).toBe(true)
    expect(result.mode?.$case).toBe('moveRotateScaleContinuous')
  })

  it('should use default parameters for helper methods', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    // Test setMove with default easing function
    Tween.setMove(entity, start, end, 1.0)
    const moveComponent = Tween.get(entity)
    expect(moveComponent.easingFunction).toBe(EasingFunction.EF_LINEAR)
    expect(moveComponent.playing).toBe(true)

    // Test setScale with default easing function
    Tween.setScale(entity, start, end, 2.0)
    const scaleComponent = Tween.get(entity)
    expect(scaleComponent.easingFunction).toBe(EasingFunction.EF_LINEAR)
    expect(scaleComponent.playing).toBe(true)

    // Test setRotate with default easing function
    Tween.setRotate(entity, startQuat, endQuat, 1.5)
    const rotateComponent = Tween.get(entity)
    expect(rotateComponent.easingFunction).toBe(EasingFunction.EF_LINEAR)
    expect(rotateComponent.playing).toBe(true)

    // Test setMoveContinuous with default duration
    const direction = { x: 1, y: 0, z: 0 }
    Tween.setMoveContinuous(entity, direction, 2.0)
    const moveContinuousComponent = Tween.get(entity)
    expect(moveContinuousComponent.duration).toBe(0)
    expect(moveContinuousComponent.playing).toBe(true)

    // Test setRotateContinuous with default duration
    Tween.setRotateContinuous(entity, { x: 0, y: 1, z: 0, w: 0 }, 1.5)
    const rotateContinuousComponent = Tween.get(entity)
    expect(rotateContinuousComponent.duration).toBe(0)
    expect(rotateContinuousComponent.playing).toBe(true)

    // Test setTextureMove with default movement type and easing function
    Tween.setTextureMove(entity, start2d, end2d, 1.0)
    const textureComponent = Tween.get(entity)
    expect(textureComponent.mode).toStrictEqual({
      $case: 'textureMove',
      textureMove: {
        start: start2d,
        end: end2d,
        movementType: TextureMovementType.TMT_OFFSET
      }
    })
    expect(textureComponent.easingFunction).toBe(EasingFunction.EF_LINEAR)
    expect(textureComponent.playing).toBe(true)

    // Test setTextureMove with default easing function only
    Tween.setTextureMove(entity, start2d, end2d, 2.0, TextureMovementType.TMT_TILING)
    const textureComponent2 = Tween.get(entity)
    expect(textureComponent2.mode).toStrictEqual({
      $case: 'textureMove',
      textureMove: {
        start: start2d,
        end: end2d,
        movementType: TextureMovementType.TMT_TILING
      }
    })
    expect(textureComponent2.easingFunction).toBe(EasingFunction.EF_LINEAR)
    expect(textureComponent2.playing).toBe(true)

    // Test setTextureMoveContinuous with default movement type and duration
    Tween.setTextureMoveContinuous(entity, { x: 1, y: 1 }, 3.0)
    const component = Tween.get(entity)
    expect(component.duration).toBe(0)
    expect(component.playing).toBe(true)
    expect(component.mode).toStrictEqual({
      $case: 'textureMoveContinuous',
      textureMoveContinuous: {
        direction: { x: 1, y: 1 },
        speed: 3.0,
        movementType: TextureMovementType.TMT_OFFSET
      }
    })

    // Test setMoveRotateScale with default easing function
    Tween.setMoveRotateScale(entity, {
      position: { start, end },
      rotation: { start: startQuat, end: endQuat },
      scale: { start, end },
      duration: 2000
    })
    const mrsComponent = Tween.get(entity)
    expect(mrsComponent.easingFunction).toBe(EasingFunction.EF_LINEAR)
    expect(mrsComponent.playing).toBe(true)
    expect(mrsComponent.mode?.$case).toBe('moveRotateScale')

    // Test setMoveRotateScaleContinuous with default duration
    Tween.setMoveRotateScaleContinuous(entity, {
      position: { direction: { x: 1, y: 0, z: 0 } },
      rotation: { direction: startQuat },
      scale: { direction: { x: 0, y: 0, z: 0 } },
      speed: 5.0
    })
    const mrscComponent = Tween.get(entity)
    expect(mrscComponent.duration).toBe(0)
    expect(mrscComponent.playing).toBe(true)
    expect(mrscComponent.mode?.$case).toBe('moveRotateScaleContinuous')
  })

  it('should work with various optional parameter combinations', () => {
    const newEngine = Engine()
    const entity = newEngine.addEntity()
    const Tween = components.Tween(newEngine)

    // Test setMove with only required parameters
    Tween.setMove(entity, start, end, 1.0)
    expect(Tween.get(entity)).toMatchObject({
      mode: { $case: 'move' },
      duration: 1.0,
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
    })

    // Test setScale with only required parameters
    Tween.setScale(entity, { x: 1, y: 1, z: 1 }, { x: 2, y: 2, z: 2 }, 0.5)
    expect(Tween.get(entity)).toMatchObject({
      mode: { $case: 'scale' },
      duration: 0.5,
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
    })

    // Test setRotate with only required parameters
    Tween.setRotate(entity, startQuat, endQuat, 2.0)
    expect(Tween.get(entity)).toMatchObject({
      mode: { $case: 'rotate' },
      duration: 2.0,
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
    })

    // Test setTextureMove with only required parameters
    Tween.setTextureMove(entity, start2d, end2d, 3.0)
    const textureResult = Tween.get(entity)
    expect(textureResult).toMatchObject({
      mode: { $case: 'textureMove' },
      duration: 3.0,
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
    })
    expect(textureResult.mode).toStrictEqual({
      $case: 'textureMove',
      textureMove: {
        start: start2d,
        end: end2d,
        movementType: TextureMovementType.TMT_OFFSET
      }
    })

    // Test setTextureMove with custom movement type but default easing
    Tween.setTextureMove(entity, start2d, end2d, 1.5, TextureMovementType.TMT_TILING)
    const textureResult2 = Tween.get(entity)
    expect(textureResult2).toMatchObject({
      mode: { $case: 'textureMove' },
      duration: 1.5,
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
    })
    expect(textureResult2.mode).toStrictEqual({
      $case: 'textureMove',
      textureMove: {
        start: start2d,
        end: end2d,
        movementType: TextureMovementType.TMT_TILING
      }
    })

    // Test setMoveContinuous with only required parameters (default duration)
    const direction = { x: 1, y: 0, z: 0 }
    Tween.setMoveContinuous(entity, direction, 2.5)
    expect(Tween.get(entity)).toMatchObject({
      mode: { $case: 'moveContinuous' },
      duration: 0,
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
    })

    // Test setRotateContinuous with only required parameters (default duration)
    const rotDirection = { x: 0, y: 1, z: 0, w: 0 }
    Tween.setRotateContinuous(entity, rotDirection, 1.8)
    expect(Tween.get(entity)).toMatchObject({
      mode: { $case: 'rotateContinuous' },
      duration: 0,
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
    })

    // Test setTextureMoveContinuous with only required parameters (default movement type and duration)
    Tween.setTextureMoveContinuous(entity, { x: 0.3, y: -0.7 }, 4.2)
    const textureContinuousResult = Tween.get(entity)
    expect(textureContinuousResult).toMatchObject({
      mode: { $case: 'textureMoveContinuous' },
      duration: 0,
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
    })
    expect(textureContinuousResult.mode).toStrictEqual({
      $case: 'textureMoveContinuous',
      textureMoveContinuous: {
        direction: { x: 0.3, y: -0.7 },
        speed: 4.2,
        movementType: TextureMovementType.TMT_OFFSET
      }
    })

    // Test setTextureMoveContinuous with custom movement type but default duration
    Tween.setTextureMoveContinuous(entity, { x: 1, y: 0.5 }, 2.1, TextureMovementType.TMT_TILING)
    const textureContinuousResult2 = Tween.get(entity)
    expect(textureContinuousResult2).toMatchObject({
      mode: { $case: 'textureMoveContinuous' },
      duration: 0,
      easingFunction: EasingFunction.EF_LINEAR,
      playing: true
    })
    expect(textureContinuousResult2.mode).toStrictEqual({
      $case: 'textureMoveContinuous',
      textureMoveContinuous: {
        direction: { x: 1, y: 0.5 },
        speed: 2.1,
        movementType: TextureMovementType.TMT_TILING
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
    expect(initialComponent.playing).toBe(true)

    // Replace with different tween type
    Tween.setScale(entity, { x: 1, y: 1, z: 1 }, { x: 2, y: 2, z: 2 }, 2.0, EasingFunction.EF_EASEINQUAD)
    const replacedComponent = Tween.get(entity)
    expect(replacedComponent.mode?.$case).toBe('scale')
    expect(replacedComponent.duration).toBe(2.0)
    expect(replacedComponent.easingFunction).toBe(EasingFunction.EF_EASEINQUAD)
    expect(replacedComponent.playing).toBe(true)

    // Replace with continuous mode
    const direction = { x: 0, y: 1, z: 0 }
    Tween.setMoveContinuous(entity, direction, 5.0, 10.0)
    const continuousComponent = Tween.get(entity)
    expect(continuousComponent.mode?.$case).toBe('moveContinuous')
    expect(continuousComponent.duration).toBe(10.0)
    expect(continuousComponent.playing).toBe(true)
  })
})
