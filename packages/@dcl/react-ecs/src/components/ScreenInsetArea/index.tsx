import { ReactEcs } from '../../react-ecs'
import { UiEntity } from '../index'
import { compensateInsetForUiScale, getScreenInsetArea } from '../utils'
import { UiScreenInsetAreaProps } from './types'

/**
 *
 * @public
 * ScreenInsetArea component
 *
 * Constrains its children to the area inside the renderer-reported screen
 * inset (safe margins). On mobile this is the area excluding the notch,
 * status bar, home indicator and rounded corners. On desktop the insets are
 * typically zero, so the container fills the canvas.
 *
 * The container is absolutely positioned with top/left/right/bottom matching
 * the current `UiCanvasInformation.screenInsetArea`, so a child sized
 * 100%x100% fills the safe area exactly.
 *
 * @example
 * <ScreenInsetArea><MyHud /></ScreenInsetArea>
 *
 * @category Component
 */
/* @__PURE__ */
export function ScreenInsetArea(props: UiScreenInsetAreaProps) {
  // Insets are canvas px; pre-divide so the parser's scale multiplication cancels out.
  const { top, left, right, bottom } = compensateInsetForUiScale(getScreenInsetArea())
  const { uiTransform, ...otherProps } = props

  return (
    <UiEntity
      {...otherProps}
      uiTransform={{
        ...uiTransform,
        positionType: 'absolute',
        position: { top, left, right, bottom }
      }}
    />
  )
}
