import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import { Tween, PBTween, Move, Rotate, Scale, TextureMove } from '../generated/index.gen'

/**
 * @public
 */
export interface TweenHelper {
  /**
   * @returns a move mode tween
   */
  Move: (move: Move) => PBTween['mode']
  /**
   * @returns a move mode tween
   */
  Rotate: (rotate: Rotate) => PBTween['mode']
  /**
   * @returns a move mode tween
   */
  Scale: (scale: Scale) => PBTween['mode']

  /**
   * @returns a texture move mode tween
   */
  TextureMove: (textureMove: TextureMove) => PBTween['mode']
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
  Rotate(rotate) {
    return {
      $case: 'rotate',
      rotate
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
