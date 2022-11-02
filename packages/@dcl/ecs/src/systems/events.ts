import { InputAction } from '../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { PBPointerEventsResult_PointerCommand } from '../components/generated/pb/decentraland/sdk/components/pointer_events_result.gen'
import { PointerEventType } from '../components/generated/pb/decentraland/sdk/components/pointer_hover_feedback.gen'
import { Entity, IEngine, IInput } from '../engine'

declare const engine: IEngine

export type EventsSystem = typeof EventsSystem
export namespace EventsSystem {
  export type Callback = (
    event: PBPointerEventsResult_PointerCommand
  ) => void | Promise<void>

  export type Options = {
    button?: InputAction
    hoverText?: string
    maxDistance?: number
  }

  enum EventType {
    Click,
    Down,
    Up
  }
  type EventMapType = Map<EventType, { cb: Callback; opts: Required<Options> }>

  const getDefaultOpts = (opts: Options = {}): Required<Options> => ({
    button: InputAction.IA_ANY,
    hoverText: 'Interact',
    maxDistance: 100,
    ...opts
  })

  const eventsMap = new Map<Entity, EventMapType>()

  function getEvent(entity: Entity) {
    return (
      eventsMap.get(entity) || eventsMap.set(entity, new Map()).get(entity)!
    )
  }

  function setHoverFeedback(
    entity: Entity,
    type: PointerEventType,
    opts: Options
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
          hoverText: opts.hoverText,
          maxDistance: opts.maxDistance
        }
      })
    }
  }

  function removeHoverFeedback(
    entity: Entity,
    type: PointerEventType,
    button: InputAction
  ) {
    const { PointerHoverFeedback } = engine.baseComponents
    const pointerEvent = PointerHoverFeedback.getMutableOrNull(entity)
    if (!pointerEvent) return
    pointerEvent.pointerEvents = pointerEvent.pointerEvents.filter(
      (pointer) =>
        !(pointer.eventInfo?.button === button && pointer.eventType === type)
    )
  }

  function getPointerEvent(eventType: EventType) {
    if (eventType === EventType.Up) {
      return PointerEventType.PET_UP
    }
    return PointerEventType.PET_DOWN
  }

  function removeEvent(entity: Entity, type: EventType) {
    const event = getEvent(entity)
    const pointerEvent = event.get(type)

    if (pointerEvent?.opts.hoverText) {
      removeHoverFeedback(
        entity,
        getPointerEvent(type),
        pointerEvent.opts.button
      )
    }

    event.delete(type)
  }

  /**
   * @internal
   * Remove the callback for onClick event
   * @param entity Entity where the callback was attached
   */
  export function removeOnClick(entity: Entity) {
    removeEvent(entity, EventType.Click)
  }

  /**
   * @public
   * Remove the callback for onPointerDown event
   * @param entity Entity where the callback was attached
   */
  export function removeOnPointerDown(entity: Entity) {
    removeEvent(entity, EventType.Down)
  }

  /**
   * @public
   * Remove the callback for onPointerUp event
   * @param entity Entity where the callback was attached
   */
  export function removeOnPointerUp(entity: Entity) {
    removeEvent(entity, EventType.Up)
  }

  /**
   * @internal
   * Execute callback when the user clicks the entity.
   * @param entity Entity to attach the callback
   * @param cb Function to execute when onPointerDown fires
   * @param opts Opts to trigger Feedback and Button
   */
  export function onClick(entity: Entity, cb: Callback, opts?: Options) {
    const options = getDefaultOpts(opts)
    // Clear previous event with over feedback included
    removeEvent(entity, EventType.Click)

    // Set new event
    getEvent(entity).set(EventType.Click, { cb, opts: options })
    setHoverFeedback(entity, PointerEventType.PET_DOWN, options)
  }

  /**
   * @public
   * Execute callback when the user press the InputButton pointing at the entity
   * @param entity Entity to attach the callback
   * @param cb Function to execute when click fires
   * @param opts Opts to trigger Feedback and Button
   */
  export function onPointerDown(entity: Entity, cb: Callback, opts?: Options) {
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.Down)
    getEvent(entity).set(EventType.Down, { cb, opts: options })
    setHoverFeedback(entity, PointerEventType.PET_DOWN, options)
  }

  /**
   * @public
   * Execute callback when the user releases the InputButton pointing at the entity
   * @param entity Entity to attach the callback
   * @param cb Function to execute when click fires
   * @param opts Opts to trigger Feedback and Button
   */
  export function onPointerUp(entity: Entity, cb: Callback, opts?: Options) {
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.Up)
    getEvent(entity).set(EventType.Up, { cb, opts: options })
    setHoverFeedback(entity, PointerEventType.PET_UP, options)
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
          if (eventType === EventType.Click) {
            const command = Input.getClick(opts.button, entity)
            if (command) void cb(command.up)
          }

          if (eventType === EventType.Down || eventType === EventType.Up) {
            const command = Input.getInputCommand(
              opts.button,
              getPointerEvent(eventType),
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
