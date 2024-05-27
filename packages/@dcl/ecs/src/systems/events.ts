import { InputAction } from '../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { PBPointerEventsResult } from '../components/generated/pb/decentraland/sdk/components/pointer_events_result.gen'
import { PointerEventType } from '../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import * as components from '../components'
import { IEngine } from '../engine/types'
import { Entity, EntityState } from '../engine/entity'
import { IInputSystem } from '../engine/input'
import { checkNotThenable } from '../runtime/invariant'

/**
 * @public
 */
export type EventSystemCallback = (event: PBPointerEventsResult) => void

/**
 * @public
 */
export type EventSystemOptions = {
  button: InputAction
  hoverText?: string
  maxDistance?: number
  showFeedback?: boolean
}

/**
 * @public
 */
export interface PointerEventsSystem {
  /**
   * @internal
   * Remove the callback for onClick event
   * @param entity - Entity where the callback was attached
   */
  removeOnClick(entity: Entity): void
  /**
   * @public
   * Remove the callback for onPointerDown event
   * @param entity - Entity where the callback was attached
   */
  removeOnPointerDown(entity: Entity): void

  /**
   * @public
   * Remove the callback for onPointerUp event
   * @param entity - Entity where the callback was attached
   */
  removeOnPointerUp(entity: Entity): void

  /**
   * @internal
   * Execute callback when the user clicks the entity.
   * @param entity - Entity to attach the callback - Opts to trigger Feedback and Button
   * @param cb - Function to execute when onPointerDown fires
   */
  onClick(opts: { entity: Entity; opts?: Partial<EventSystemOptions> }, cb: EventSystemCallback): void

  /**
   * @public
   * Execute callback when the user press the InputButton pointing at the entity
   * @param pointerData - Entity to attach the callback, Opts to trigger Feedback and Button
   * @param cb - Function to execute when click fires
   */
  onPointerDown(pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> }, cb: EventSystemCallback): void
  /**
   * @deprecated Use onPointerDown with (pointerData, cb)
   * @param entity - Entity to attach the callback
   * @param cb - Function to execute when click fires
   * @param opts - Opts to trigger Feedback and Button
   */
  onPointerDown(entity: Entity, cb: EventSystemCallback, opts?: Partial<EventSystemOptions>): void
  /**
   * @public
   * Execute callback when the user releases the InputButton pointing at the entity
   * @param pointerData - Entity to attach the callback - Opts to trigger Feedback and Button
   * @param cb - Function to execute when click fires
   */
  onPointerUp(pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> }, cb: EventSystemCallback): void
  /**
   * @deprecated Use onPointerUp with (pointerData, cb)
   * @param entity - Entity to attach the callback
   * @param cb - Function to execute when click fires
   * @param opts - Opts to trigger Feedback and Button
   */
  onPointerUp(entity: Entity, cb: EventSystemCallback, opts?: Partial<EventSystemOptions>): void
}

/**
 * @public
 * ___DO NOT USE___ use pointerEventsSystem instead
 */
export function createPointerEventsSystem(engine: IEngine, inputSystem: IInputSystem): PointerEventsSystem {
  const PointerEvents = components.PointerEvents(engine)

  enum EventType {
    Click,
    Down,
    Up
  }
  type EventMapType = Map<EventType, { cb: EventSystemCallback; opts: EventSystemOptions }>

  const getDefaultOpts = (opts: Partial<EventSystemOptions> = {}): EventSystemOptions => ({
    button: InputAction.IA_ANY,
    ...opts
  })

  const eventsMap = new Map<Entity, EventMapType>()

  function getEvent(entity: Entity) {
    return eventsMap.get(entity) || eventsMap.set(entity, new Map()).get(entity)!
  }

  function setPointerEvent(entity: Entity, type: PointerEventType, opts: EventSystemOptions) {
    if (opts.hoverText || opts.showFeedback) {
      const pointerEvent = PointerEvents.getMutableOrNull(entity) || PointerEvents.create(entity)

      pointerEvent.pointerEvents.push({
        eventType: type,
        eventInfo: {
          button: opts.button,
          showFeedback: opts.showFeedback,
          hoverText: opts.hoverText,
          maxDistance: opts.maxDistance
        }
      })
    }
  }

  function removePointerEvent(entity: Entity, type: PointerEventType, button: InputAction) {
    const pointerEvent = PointerEvents.getMutableOrNull(entity)
    if (!pointerEvent) return
    pointerEvent.pointerEvents = pointerEvent.pointerEvents.filter(
      (pointer) => !(pointer.eventInfo?.button === button && pointer.eventType === type)
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
      removePointerEvent(entity, getPointerEvent(type), pointerEvent.opts.button)
    }

    event.delete(type)
  }

  // @internal
  engine.addSystem(function EventSystem() {
    for (const [entity, event] of eventsMap) {
      if (engine.getEntityState(entity) === EntityState.Removed) {
        eventsMap.delete(entity)
        continue
      }

      for (const [eventType, { cb, opts }] of event) {
        if (eventType === EventType.Click) {
          const command = inputSystem.getClick(opts.button, entity)
          if (command)
            checkNotThenable(cb(command.up), 'Click event returned a thenable. Only synchronous functions are allowed')
        }

        if (eventType === EventType.Down || eventType === EventType.Up) {
          const command = inputSystem.getInputCommand(opts.button, getPointerEvent(eventType), entity)
          if (command) {
            checkNotThenable(cb(command), 'Event handler returned a thenable. Only synchronous functions are allowed')
          }
        }
      }
    }
  })

  const onPointerDown: PointerEventsSystem['onPointerDown'] = (...args) => {
    const [data, cb, maybeOpts] = args
    if (typeof data === 'number') {
      return onPointerDown({ entity: data, opts: maybeOpts ?? {} }, cb)
    }
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.Down)
    getEvent(entity).set(EventType.Down, { cb, opts: options })
    setPointerEvent(entity, PointerEventType.PET_DOWN, options)
  }

  const onPointerUp: PointerEventsSystem['onPointerUp'] = (...args) => {
    const [data, cb, maybeOpts] = args
    if (typeof data === 'number') {
      return onPointerUp({ entity: data, opts: maybeOpts ?? {} }, cb)
    }
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.Up)
    getEvent(entity).set(EventType.Up, { cb, opts: options })
    setPointerEvent(entity, PointerEventType.PET_UP, options)
  }

  return {
    removeOnClick(entity: Entity) {
      removeEvent(entity, EventType.Click)
    },

    removeOnPointerDown(entity: Entity) {
      removeEvent(entity, EventType.Down)
    },

    removeOnPointerUp(entity: Entity) {
      removeEvent(entity, EventType.Up)
    },

    onClick(value, cb) {
      const { entity } = value
      const options = getDefaultOpts(value.opts)
      // Clear previous event with over feedback included
      removeEvent(entity, EventType.Click)

      // Set new event
      getEvent(entity).set(EventType.Click, { cb, opts: options })
      setPointerEvent(entity, PointerEventType.PET_DOWN, options)
    },

    onPointerDown,
    onPointerUp
  }
}
