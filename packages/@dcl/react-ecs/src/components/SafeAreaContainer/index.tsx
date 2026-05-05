import { ReactEcs } from '../../react-ecs'
import { UiEntity } from '../index'
import { getSafeAreaInsets } from '../utils'
import { UiSafeAreaContainerProps } from './types'

/**
 *
 * @public
 * SafeAreaContainer component
 *
 * Constrains its children to the renderer's reported interactable area — the
 * region of the UI canvas not covered by platform UI (chat, minimap on
 * desktop) or hardware insets (notch, home indicator on mobile). The
 * container is absolutely positioned with top/left/right/bottom matching the
 * current insets, so a child sized 100%x100% fills the safe area exactly.
 *
 * @example
 * <SafeAreaContainer><MyHud /></SafeAreaContainer>
 *
 * @category Component
 */
/* @__PURE__ */
export function SafeAreaContainer(props: UiSafeAreaContainerProps) {
  const { top, left, right, bottom } = getSafeAreaInsets()
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
