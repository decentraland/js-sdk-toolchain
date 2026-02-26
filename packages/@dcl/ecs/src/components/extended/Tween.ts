import { Entity, IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import { Quaternion, Vector2, Vector3 } from '../generated/pb/decentraland/common/vectors.gen'
import {
  EasingFunction,
  Move,
  MoveContinuous,
  MoveRotateScale,
  MoveRotateScaleContinuous,
  PBTween,
  Rotate,
  RotateContinuous,
  Scale,
  TextureMove,
  TextureMoveContinuous,
  TextureMovementType,
  Tween
} from '../generated/index.gen'

/**
 * @public
 * Parameters for setMoveRotateScale. At least one of position, rotation, or scale must be provided.
 */
export interface SetMoveRotateScaleParams {
  /** Position tween (start → end). Optional. */
  position?: { start: Vector3; end: Vector3 }
  /** Rotation tween (start → end). Optional. */
  rotation?: { start: Quaternion; end: Quaternion }
  /** Scale tween (start → end). Optional. */
  scale?: { start: Vector3; end: Vector3 }
  /** Duration of the tween in milliseconds. */
  duration: number
  /** Easing function (defaults to EF_LINEAR). */
  easingFunction?: EasingFunction
}

/**
 * @public
 * Parameters for setMoveRotateScaleContinuous. At least one of position, rotation, or scale must be provided.
 */
export interface SetMoveRotateScaleContinuousParams {
  /** Position direction for continuous movement. Optional. */
  position?: { direction: Vector3 }
  /** Rotation direction for continuous rotation. Optional. */
  rotation?: { direction: Quaternion }
  /** Scale direction for continuous scale change. Optional. */
  scale?: { direction: Vector3 }
  /** Speed of the animation per second. */
  speed: number
  /** Duration in milliseconds (defaults to 0 for infinite). */
  duration?: number
}

function validateAtLeastOneMoveRotateScale(
  hasPosition: boolean,
  hasRotation: boolean,
  hasScale: boolean,
  apiName: string
): void {
  if (!hasPosition && !hasRotation && !hasScale) {
    throw new Error(`${apiName}: at least one of position, rotation, or scale must be provided`)
  }
}

function validateDuration(duration: number, apiName: string): void {
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0) {
    throw new Error(`${apiName}: duration must be a non-negative finite number`)
  }
}

function validateSpeed(speed: number, apiName: string): void {
  if (typeof speed !== 'number' || !Number.isFinite(speed)) {
    throw new Error(`${apiName}: speed must be a finite number`)
  }
}

function validateSetMoveRotateScaleParams(params: SetMoveRotateScaleParams, apiName: string): void {
  const hasPosition = params.position != null
  const hasRotation = params.rotation != null
  const hasScale = params.scale != null
  validateAtLeastOneMoveRotateScale(hasPosition, hasRotation, hasScale, apiName)
  validateDuration(params.duration, apiName)
  if (hasPosition) {
    const pos = params.position!
    if (pos.start == null || pos.end == null) {
      throw new Error(`${apiName}: position must have both start and end`)
    }
  }
  if (hasRotation) {
    const rot = params.rotation!
    if (rot.start == null || rot.end == null) {
      throw new Error(`${apiName}: rotation must have both start and end`)
    }
  }
  if (hasScale) {
    const scl = params.scale!
    if (scl.start == null || scl.end == null) {
      throw new Error(`${apiName}: scale must have both start and end`)
    }
  }
}

function validateSetMoveRotateScaleContinuousParams(
  params: SetMoveRotateScaleContinuousParams,
  apiName: string
): void {
  const hasPosition = params.position != null
  const hasRotation = params.rotation != null
  const hasScale = params.scale != null
  validateAtLeastOneMoveRotateScale(hasPosition, hasRotation, hasScale, apiName)
  validateSpeed(params.speed, apiName)
  const duration = params.duration ?? 0
  validateDuration(duration, apiName)
  if (hasPosition && params.position!.direction == null) {
    throw new Error(`${apiName}: position must have direction`)
  }
  if (hasRotation && params.rotation!.direction == null) {
    throw new Error(`${apiName}: rotation must have direction`)
  }
  if (hasScale && params.scale!.direction == null) {
    throw new Error(`${apiName}: scale must have direction`)
  }
}

/**
 * @public
 */
export interface TweenHelper {
  /**
   * @returns a move mode tween
   */
  Move: (move: Move) => PBTween['mode']
  /**
   * @returns a move-continuous mode tween
   */
  MoveContinuous: (move: MoveContinuous) => PBTween['mode']
  /**
   * @returns a rotate mode tween
   */
  Rotate: (rotate: Rotate) => PBTween['mode']
  /**
   * @returns a rotate-continuous mode tween
   */
  RotateContinuous: (rotate: RotateContinuous) => PBTween['mode']
  /**
   * @returns a scale mode tween
   */
  Scale: (scale: Scale) => PBTween['mode']
  /**
   * @returns a texture-move mode tween
   */
  TextureMove: (textureMove: TextureMove) => PBTween['mode']
  /**
   * @returns a texture-move-continuous mode tween
   */
  TextureMoveContinuous: (textureMove: TextureMoveContinuous) => PBTween['mode']
  /**
   * @returns a move-rotate-scale mode tween
   */
  MoveRotateScale: (moveRotateScale: MoveRotateScale) => PBTween['mode']
  /**
   * @returns a move-rotate-scale-continuous mode tween
   */
  MoveRotateScaleContinuous: (moveRotateScaleContinuous: MoveRotateScaleContinuous) => PBTween['mode']
}

/**
 * @public
 */
export interface TweenComponentDefinitionExtended extends LastWriteWinElementSetComponentDefinition<PBTween> {
  /**
   * Texture helpers with constructor
   */
  Mode: TweenHelper

  /**
   * @public
   *
   * Creates or replaces a move tween component that animates an entity's position from start to end
   * @param entity - entity to apply the tween to
   * @param start - starting position vector
   * @param end - ending position vector
   * @param duration - duration of the tween in milliseconds
   * @param easingFunction - easing function to use (defaults to EF_LINEAR)
   */
  setMove(entity: Entity, start: Vector3, end: Vector3, duration: number, easingFunction?: EasingFunction): void

  /**
   * @public
   *
   * Creates or replaces a scale tween component that animates an entity's scale from start to end
   * @param entity - entity to apply the tween to
   * @param start - starting scale vector
   * @param end - ending scale vector
   * @param duration - duration of the tween in milliseconds
   * @param easingFunction - easing function to use (defaults to EF_LINEAR)
   */
  setScale(entity: Entity, start: Vector3, end: Vector3, duration: number, easingFunction?: EasingFunction): void

  /**
   * @public
   *
   * Creates or replaces a rotation tween component that animates an entity's rotation from start to end
   * @param entity - entity to apply the tween to
   * @param start - starting rotation quaternion
   * @param end - ending rotation quaternion
   * @param duration - duration of the tween in milliseconds
   * @param easingFunction - easing function to use (defaults to EF_LINEAR)
   */
  setRotate(entity: Entity, start: Quaternion, end: Quaternion, duration: number, easingFunction?: EasingFunction): void

  /**
   * @public
   *
   * Creates or replaces a texture move tween component that animates texture UV coordinates from start to end
   * @param entity - entity to apply the tween to
   * @param start - starting UV coordinates
   * @param end - ending UV coordinates
   * @param duration - duration of the tween in milliseconds
   * @param movementType - type of texture movement (defaults to TMT_OFFSET)
   * @param easingFunction - easing function to use (defaults to EF_LINEAR)
   */
  setTextureMove(
    entity: Entity,
    start: Vector2,
    end: Vector2,
    duration: number,
    movementType?: TextureMovementType,
    easingFunction?: EasingFunction
  ): void

  /**
   * @public
   *
   * Creates or replaces a continuous move tween component that moves an entity continuously in a direction
   * @param entity - entity to apply the tween to
   * @param direction - direction vector to move towards
   * @param speed - speed of movement per second
   * @param duration - duration of the tween in milliseconds (defaults to 0 for infinite)
   */
  setMoveContinuous(entity: Entity, direction: Vector3, speed: number, duration?: number): void

  /**
   * @public
   *
   * Creates or replaces a continuous rotation tween component that rotates an entity continuously
   * @param entity - entity to apply the tween to
   * @param direction - rotation direction quaternion
   * @param speed - speed of rotation per second
   * @param duration - duration of the tween in milliseconds (defaults to 0 for infinite)
   */
  setRotateContinuous(entity: Entity, direction: Quaternion, speed: number, duration?: number): void

  /**
   * @public
   *
   * Creates or replaces a continuous texture move tween component that moves texture UV coordinates continuously
   * @param entity - entity to apply the tween to
   * @param direction - direction vector for UV movement
   * @param speed - speed of UV movement per second
   * @param movementType - type of texture movement (defaults to TMT_OFFSET)
   * @param duration - duration of the tween in milliseconds (defaults to 0 for infinite)
   */
  setTextureMoveContinuous(
    entity: Entity,
    direction: Vector2,
    speed: number,
    movementType?: TextureMovementType,
    duration?: number
  ): void

  /**
   * @public
   *
   * Creates or replaces a move-rotate-scale tween component that simultaneously animates
   * an entity's position, rotation, and/or scale from start to end. Provide only the
   * properties you need (at least one of position, rotation, or scale).
   * @param entity - entity to apply the tween to
   * @param params - object with optional position, rotation, scale (each with start/end), duration, and optional easingFunction
   */
  setMoveRotateScale(entity: Entity, params: SetMoveRotateScaleParams): void

  /**
   * @public
   *
   * Creates or replaces a continuous move-rotate-scale tween component that simultaneously
   * moves, rotates, and/or scales an entity continuously. Provide only the properties
   * you need (at least one of position, rotation, or scale).
   * @param entity - entity to apply the tween to
   * @param params - object with optional position, rotation, scale (each with direction), speed, and optional duration
   */
  setMoveRotateScaleContinuous(entity: Entity, params: SetMoveRotateScaleContinuousParams): void
}

const TweenHelper: TweenHelper = {
  Move(move) {
    return {
      $case: 'move' as const,
      move
    }
  },
  MoveContinuous(moveContinuous) {
    return {
      $case: 'moveContinuous' as const,
      moveContinuous
    }
  },
  Rotate(rotate) {
    return {
      $case: 'rotate',
      rotate
    }
  },
  RotateContinuous(rotateContinuous) {
    return {
      $case: 'rotateContinuous',
      rotateContinuous
    }
  },
  Scale(scale) {
    return {
      $case: 'scale',
      scale
    }
  },
  TextureMove(textureMove) {
    return {
      $case: 'textureMove',
      textureMove
    }
  },
  TextureMoveContinuous(textureMoveContinuous) {
    return {
      $case: 'textureMoveContinuous',
      textureMoveContinuous
    }
  },
  MoveRotateScale(moveRotateScale) {
    return {
      $case: 'moveRotateScale',
      moveRotateScale
    }
  },
  MoveRotateScaleContinuous(moveRotateScaleContinuous) {
    return {
      $case: 'moveRotateScaleContinuous',
      moveRotateScaleContinuous
    }
  }
}

export function defineTweenComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): TweenComponentDefinitionExtended {
  const theComponent = Tween(engine)

  return {
    ...theComponent,
    Mode: TweenHelper,
    setMove(
      entity: Entity,
      start: Vector3,
      end: Vector3,
      duration: number,
      easingFunction: EasingFunction = EasingFunction.EF_LINEAR
    ) {
      theComponent.createOrReplace(entity, {
        mode: {
          $case: 'move',
          move: {
            start,
            end
          }
        },
        duration,
        easingFunction,
        playing: true
      })
    },
    setScale(
      entity: Entity,
      start: Vector3,
      end: Vector3,
      duration: number,
      easingFunction: EasingFunction = EasingFunction.EF_LINEAR
    ) {
      theComponent.createOrReplace(entity, {
        mode: {
          $case: 'scale',
          scale: {
            start,
            end
          }
        },
        duration,
        easingFunction,
        playing: true
      })
    },
    setRotate(
      entity: Entity,
      start: Quaternion,
      end: Quaternion,
      duration: number,
      easingFunction: EasingFunction = EasingFunction.EF_LINEAR
    ) {
      theComponent.createOrReplace(entity, {
        mode: {
          $case: 'rotate',
          rotate: {
            start,
            end
          }
        },
        duration,
        easingFunction,
        playing: true
      })
    },
    setTextureMove(
      entity: Entity,
      start: Vector2,
      end: Vector2,
      duration: number,
      movementType: TextureMovementType = TextureMovementType.TMT_OFFSET,
      easingFunction: EasingFunction = EasingFunction.EF_LINEAR
    ) {
      theComponent.createOrReplace(entity, {
        mode: {
          $case: 'textureMove',
          textureMove: {
            start,
            end,
            movementType
          }
        },
        duration,
        easingFunction,
        playing: true
      })
    },
    setMoveContinuous(entity: Entity, direction: Vector3, speed: number, duration: number = 0) {
      theComponent.createOrReplace(entity, {
        mode: {
          $case: 'moveContinuous',
          moveContinuous: {
            direction,
            speed
          }
        },
        duration,
        easingFunction: EasingFunction.EF_LINEAR,
        playing: true
      })
    },
    setRotateContinuous(entity: Entity, direction: Quaternion, speed: number, duration: number = 0) {
      theComponent.createOrReplace(entity, {
        mode: {
          $case: 'rotateContinuous',
          rotateContinuous: {
            direction,
            speed
          }
        },
        duration,
        easingFunction: EasingFunction.EF_LINEAR,
        playing: true
      })
    },
    setTextureMoveContinuous(
      entity: Entity,
      direction: Vector2,
      speed: number,
      movementType: TextureMovementType = TextureMovementType.TMT_OFFSET,
      duration: number = 0
    ) {
      theComponent.createOrReplace(entity, {
        mode: {
          $case: 'textureMoveContinuous',
          textureMoveContinuous: {
            direction,
            speed,
            movementType
          }
        },
        duration,
        easingFunction: EasingFunction.EF_LINEAR,
        playing: true
      })
    },
    setMoveRotateScale(entity: Entity, params: SetMoveRotateScaleParams) {
      validateSetMoveRotateScaleParams(params, 'setMoveRotateScale')
      const { position, rotation, scale, duration, easingFunction = EasingFunction.EF_LINEAR } = params
      const hasPosition = position != null
      const hasRotation = rotation != null
      const hasScale = scale != null
      const moveRotateScale: MoveRotateScale = {
        positionStart: hasPosition ? position.start : undefined,
        positionEnd: hasPosition ? position.end : undefined,
        rotationStart: hasRotation ? rotation.start : undefined,
        rotationEnd: hasRotation ? rotation.end : undefined,
        scaleStart: hasScale ? scale.start : undefined,
        scaleEnd: hasScale ? scale.end : undefined
      }
      theComponent.createOrReplace(entity, {
        mode: {
          $case: 'moveRotateScale',
          moveRotateScale
        },
        duration,
        easingFunction,
        playing: true
      })
    },
    setMoveRotateScaleContinuous(entity: Entity, params: SetMoveRotateScaleContinuousParams) {
      const duration = params.duration ?? 0
      validateSetMoveRotateScaleContinuousParams(params, 'setMoveRotateScaleContinuous')
      const { position, rotation, scale, speed } = params
      const hasPosition = position != null
      const hasRotation = rotation != null
      const hasScale = scale != null
      const moveRotateScaleContinuous: MoveRotateScaleContinuous = {
        positionDirection: hasPosition ? position.direction : undefined,
        rotationDirection: hasRotation ? rotation.direction : undefined,
        scaleDirection: hasScale ? scale.direction : undefined,
        speed
      }
      theComponent.createOrReplace(entity, {
        mode: {
          $case: 'moveRotateScaleContinuous',
          moveRotateScaleContinuous
        },
        duration,
        easingFunction: EasingFunction.EF_LINEAR,
        playing: true
      })
    }
  }
}
