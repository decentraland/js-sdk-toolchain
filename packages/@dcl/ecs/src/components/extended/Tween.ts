import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import {
  Tween,
  PBTween,
  Move,
  Rotate,
  Scale,
  TextureMove,
  MoveContinuous,
  RotateContinuous,
  TextureMoveContinuous
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
    Mode: TweenHelper
  }
}
