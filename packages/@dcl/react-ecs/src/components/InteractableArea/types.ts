import { EntityPropTypes } from '../types'

/**
 * InteractableArea component props
 *
 * The container reads the current `interactableArea` reported by the renderer
 * via `UiCanvasInformation` (the HUD-safe zone — the portion of the screen not
 * covered by client UI such as the minimap, chat window, or other overlays) and
 * constrains its children to the area inside those insets using absolute
 * positioning. Layout props that control the container's own position
 * (`positionType`, `position`) are owned by the component and are not
 * configurable from props — every other layout, background and event prop is
 * forwarded as usual.
 *
 * @public
 */
export type UiInteractableAreaProps = Omit<EntityPropTypes, 'uiTransform'> & {
  /**
   * Layout overrides forwarded to the underlying entity. The
   * `positionType` and `position` fields are reserved by the container and
   * any value provided here is ignored.
   */
  uiTransform?: Omit<NonNullable<EntityPropTypes['uiTransform']>, 'positionType' | 'position'>
}
