import { parsePosition, parseSize } from './utils'
import { PBUiTransform, UiTransformProps } from './types'

export const CANVAS_ROOT_ENTITY = 0

/**
 * @public
 */
export function parseUiTransform(props: UiTransformProps = {}): PBUiTransform {
  const {
    position,
    padding,
    margin,
    height,
    minHeight,
    maxHeight,
    width,
    maxWidth,
    minWidth,
    ...otherProps
  } = props
  return {
    ...defaultUiTransform,
    ...otherProps,
    ...parsePosition(position, 'position'),
    ...parsePosition(margin, 'margin'),
    ...parsePosition(padding, 'padding'),
    ...parseSize(height, 'height'),
    ...parseSize(minHeight, 'minHeight'),
    ...parseSize(maxHeight, 'maxHeight'),
    ...parseSize(width, 'width'),
    ...parseSize(minWidth, 'minWidth'),
    ...parseSize(maxWidth, 'maxWidth')
  }
}

const defaultUiTransform: PBUiTransform = {
  parent: CANVAS_ROOT_ENTITY,
  rightOf: 0
}
