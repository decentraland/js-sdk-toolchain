import { InputAction } from '../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { PBPointerEventsResult_PointerCommand } from '../components/generated/pb/decentraland/sdk/components/pointer_events_result.gen'
import { PointerEventType } from '../components/generated/pb/decentraland/sdk/components/pointer_hover_feedback.gen'
import { Entity, IEngine, IInput } from '../engine'

declare const engine: IEngine

export namespace EventsSystem {
  export type Callback = (
    event: PBPointerEventsResult_PointerCommand
  ) => void | Promise<void>

  export type Opts = {
    button: InputAction
    hoverText?: string
  }
  type EventMapType = Map<PointerEventType, { cb: Callback; opts: Opts }>

  const defaultOpts: Opts = {
    button: InputAction.IA_ANY,
    hoverText: ''
  }

  const eventsMap = new Map<Entity, EventMapType>()

  function getEvent(entity: Entity) {
    return (
      eventsMap.get(entity) || eventsMap.set(entity, new Map()).get(entity)!
    )
  }

  function setHoverFeedback(
    entity: Entity,
    type: PointerEventType,
    opts: Opts
  ) {
    const { PointerHoverFeedback } = engine.baseComponents
    if (opts.hoverText) {
      const pointerEvent =
        PointerHoverFeedback.getMutableOrNull(entity) ||
        PointerHoverFeedback.create(entity)

      pointerEvent.pointerEvents.push({
        eventType: type,
        eventInfo: {
          button: opts.button,
          showFeedback: true,
          hoverText: opts.hoverText
        }
      })
    }
  }

  function removeHoverFeedback(
    entity: Entity,
    type: PointerEventType,
    button: Opts['button']
  ) {
    const { PointerHoverFeedback } = engine.baseComponents
    const pointerEvent = PointerHoverFeedback.getMutableOrNull(entity)
    if (!pointerEvent) return
    pointerEvent.pointerEvents = pointerEvent.pointerEvents.filter(
      (pointer) =>
        !(pointer.eventInfo?.button === button && pointer.eventType === type)
    )
  }

  function removeEvent(entity: Entity, type: PointerEventType) {
    const event = getEvent(entity)
    const pointerEvent = event.get(type)

    if (pointerEvent?.opts.hoverText) {
      removeHoverFeedback(entity, type, pointerEvent.opts.button)
    }

    event.delete(type)
  }

  /**
   * Remove the callback for onClick event
   * @param entity Entity where the callback was attached
   */
  export function removeOnClick(entity: Entity) {
    removeEvent(entity, PointerEventType.PET_UP)
  }

  /**
   * Remove the callback for onPointerDown event
   * @param entity Entity where the callback was attached
   */
  export function removeOnPointerDown(entity: Entity) {
    removeEvent(entity, PointerEventType.PET_DOWN)
  }

  /**
   * Execute callback when the user pressed the button declared while pointing at the entity
   * @param entity Entity to attach the callback
   * @param cb Function to execute when onPointerDown fires
   * @param opts Opts to trigger Feedback and Button
   */
  export function onClick(entity: Entity, cb: Callback, opts = defaultOpts) {
    // Clear previous event with over feedback included
    removeEvent(entity, PointerEventType.PET_UP)

    // Set new event
    getEvent(entity).set(PointerEventType.PET_UP, { cb, opts })
    setHoverFeedback(entity, PointerEventType.PET_UP, opts)
  }

  /**
   * Execute callback when the user releases the button declared while pointing at the entity
   * @param entity Entity to attach the callback
   * @param cb Function to execute when click fires
   * @param opts Opts to trigger Feedback and Button
   */
  export function onPointerDown(
    entity: Entity,
    cb: Callback,
    opts = defaultOpts
  ) {
    removeEvent(entity, PointerEventType.PET_DOWN)
    getEvent(entity).set(PointerEventType.PET_DOWN, { cb, opts })
    setHoverFeedback(entity, PointerEventType.PET_DOWN, opts)
  }

  // @internal
  export function update(Input: IInput) {
    return function () {
      for (const [entity, event] of eventsMap) {
        if (!engine.entityExists(entity)) {
          eventsMap.delete(entity)
          continue
        }

        for (const [eventType, { cb, opts }] of event) {
          if (eventType === PointerEventType.PET_UP) {
            const command = Input.getClick(opts.button, entity)
            if (command) void cb(command.up)
          }

          if (eventType === PointerEventType.PET_DOWN) {
            const command = Input.getInputCommand(
              opts.button,
              PointerEventType.PET_DOWN,
              entity
            )
            if (command) {
              void cb(command)
            }
          }
        }
      }
    }
  }
}
