import { ReactEcs } from '../../react-ecs'
import { UiEntity } from '../index'
import { getInteractableArea } from '../utils'
import { UiInteractableAreaProps } from './types'

/**
 *
 * @public
 * InteractableArea component
 *
 * Constrains its children to the renderer-reported interactable area — the
 * region of the UI canvas not covered by the explorer's HUD (chat, minimap,
 * etc.). The container is absolutely positioned with top/left/right/bottom
 * matching the current `UiCanvasInformation.interactableArea`, so a child
 * sized 100%x100% fills the interactable area exactly and reactively
 * updates as the renderer reports a new value.
 *
 * @example
 * <InteractableArea><MyHud /></InteractableArea>
 *
 * @category Component
 */
/* @__PURE__ */
export function InteractableArea(props: UiInteractableAreaProps) {
  const { top, left, right, bottom } = getInteractableArea()
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
