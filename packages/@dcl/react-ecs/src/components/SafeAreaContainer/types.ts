import { EntityPropTypes } from '../types'

/**
 * SafeAreaContainer component props
 *
 * The container reads the current interactable area reported by the renderer
 * via `UiCanvasInformation` and constrains its children to that area using
 * absolute positioning. Layout props that control the container's own
 * position (`positionType`, `position`) are owned by the component and are
 * not configurable from props — every other layout, background and event
 * prop is forwarded as usual.
 *
 * @public
 */
export type UiSafeAreaContainerProps = Omit<EntityPropTypes, 'uiTransform'> & {
  /**
   * Layout overrides forwarded to the underlying entity. The
   * `positionType` and `position` fields are reserved by the container and
   * any value provided here is ignored.
   */
  uiTransform?: Omit<NonNullable<EntityPropTypes['uiTransform']>, 'positionType' | 'position'>
}
