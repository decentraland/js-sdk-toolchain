import { InputAction } from '../../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { PointerEventType } from '../../components/generated/pb/decentraland/sdk/components/pointer_events.gen'
import { Entity, IEngine } from '../../engine'
import {
  isPointerEventActiveGenerator,
  wasEntityClickedGenerator
} from '../../engine/events'

export function initializeEvents(engine: IEngine) {
  const wasEntityClickedFunc = wasEntityClickedGenerator(engine)
  const isPointerEventActiveFunc = isPointerEventActiveGenerator(engine)

  function wasEntityClicked(entity: Entity, actionButton: InputAction) {
    return wasEntityClickedFunc(entity, actionButton)
  }

  function isPointerEventActive(
    entity: Entity,
    actionButton: InputAction,
    pointerEventType: PointerEventType
  ) {
    return isPointerEventActiveFunc(entity, actionButton, pointerEventType)
  }

  return {
    /**
     * Check if an entity emitted a clicked event
     * @param entity the entity to query, for global clicks use `engine.RootEntity`
     * @param actionButton
     * @returns true if the entity was clicked in the last tick-update
     */
    wasEntityClicked,
    /**
     * Check if a pointer event has been emited in the last tick-update.
     * @param entity the entity to query, for global clicks use `engine.RootEntity`
     * @param actionButton
     * @param pointerEventType
     * @returns
     */
    isPointerEventActive
  }
}
