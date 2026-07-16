import { ReactEcs } from '../../react-ecs'
import { UiEntity } from '../index'
import { compensateInsetForUiScale, getInteractableArea } from '../utils'
import { UiInteractableAreaProps } from './types'

/**
 *
 * @public
 * InteractableArea component
 *
 * Constrains its children to the area inside the renderer-reported interactable
 * area. This is the portion of the screen not covered by client UI such as the
 * minimap, chat window, or other platform overlays. On the Unity desktop client
 * the left 25% of the screen is reserved for client UI, so this container
 * positions its children within the remaining 75%.
 *
 * The container is absolutely positioned with top/left/right/bottom matching
 * the current `UiCanvasInformation.interactableArea`, so a child sized
 * 100%x100% fills the interactable area exactly.
 *
 * @example
 * <InteractableArea><MyHud /></InteractableArea>
 *
 * @category Component
 */
/* @__PURE__ */
export function InteractableArea(props: UiInteractableAreaProps) {
  // Insets are canvas px; pre-divide so the parser's scale multiplication cancels out.
  const { top, left, right, bottom } = compensateInsetForUiScale(getInteractableArea())
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
