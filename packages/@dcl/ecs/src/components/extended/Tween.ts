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

  setMove(entity: Entity, start: Vector3, end: Vector3, duration: number, easingFunction: EasingFunction): void
  setScale(entity: Entity, start: Vector3, end: Vector3, duration: number, easingFunction: EasingFunction): void
  setRotate(entity: Entity, start: Quaternion, end: Quaternion, duration: number, easingFunction: EasingFunction): void
  setTextureMove(
    entity: Entity,
    start: Vector2,
    end: Vector2,
    duration: number,
    movementType: TextureMovementType,
    easingFunction: EasingFunction
  ): void

  setMoveContinuous(entity: Entity, direction: Vector3, speed: number, duration: number): void
  setRotateContinuous(entity: Entity, direction: Quaternion, speed: number, duration: number): void
  setTextureMoveContinuous(
    entity: Entity,
    direction: Vector2,
    speed: number,
    movementType: TextureMovementType,
    duration: number
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
        easingFunction
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
        easingFunction
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
        easingFunction
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
        easingFunction
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
        easingFunction: EasingFunction.EF_LINEAR
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
        easingFunction: EasingFunction.EF_LINEAR
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
        easingFunction: EasingFunction.EF_LINEAR
      })
    }
  }
}
