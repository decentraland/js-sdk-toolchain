import { Entity, IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import { Quaternion, Vector2, Vector3 } from '../generated/pb/decentraland/common/vectors.gen'
import {
  EasingFunction,
  Move,
  MoveContinuous,
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
   * @param duration - duration of the tween in seconds
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
   * @param duration - duration of the tween in seconds
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
   * @param duration - duration of the tween in seconds
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
   * @param duration - duration of the tween in seconds
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
   * @param duration - duration of the tween in seconds (defaults to 0 for infinite)
   */
  setMoveContinuous(entity: Entity, direction: Vector3, speed: number, duration?: number): void

  /**
   * @public
   *
   * Creates or replaces a continuous rotation tween component that rotates an entity continuously
   * @param entity - entity to apply the tween to
   * @param direction - rotation direction quaternion
   * @param speed - speed of rotation per second
   * @param duration - duration of the tween in seconds (defaults to 0 for infinite)
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
   * @param duration - duration of the tween in seconds (defaults to 0 for infinite)
   */
  setTextureMoveContinuous(
    entity: Entity,
    direction: Vector2,
    speed: number,
    movementType?: TextureMovementType,
    duration?: number
  ): void
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
    }
  }
}
