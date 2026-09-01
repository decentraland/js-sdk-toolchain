import { InputAction } from '../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { InteractionType } from '../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { PBPointerEventsResult } from '../components/generated/pb/decentraland/sdk/components/pointer_events_result.gen'
import { PointerEventType } from '../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import * as components from '../components'
import { IEngine } from '../engine/types'
import { Entity, EntityState } from '../engine/entity'
import { IInputSystem } from '../engine/input'
import { __DEV__, checkNotThenable } from '../runtime/invariant'

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
  showHighlight?: boolean
  /** @deprecated use `maxDistance` instead (same semantics: distance from the player) */
  maxPlayerDistance?: number
  priority?: number
  maxCameraDistance?: number
}

export const getDefaultOpts = (opts: Partial<EventSystemOptions> = {}): EventSystemOptions => ({
  button: InputAction.IA_ANY,
  ...opts
})

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
   * @public
   * Remove the callback for onPointerHoverEnter event
   * @param entity - Entity where the callback was attached
   */
  removeOnPointerHoverEnter(entity: Entity): void

  /**
   * @public
   * Remove the callback for onPointerHoverLeave event
   * @param entity - Entity where the callback was attached
   */
  removeOnPointerHoverLeave(entity: Entity): void

  /**
   * @public
   * Remove the callback for onProximityDown event
   * @param entity - Entity where the callback was attached
   */
  removeOnProximityDown(entity: Entity): void

  /**
   * @public
   * Remove the callback for onProximityUp event
   * @param entity - Entity where the callback was attached
   */
  removeOnProximityUp(entity: Entity): void

  /**
   * @public
   * Remove the callback for onProximityEnter event
   * @param entity - Entity where the callback was attached
   */
  removeOnProximityEnter(entity: Entity): void

  /**
   * @public
   * Remove the callback for onProximityLeave event
   * @param entity - Entity where the callback was attached
   */
  removeOnProximityLeave(entity: Entity): void

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

  /**
   * @public
   * Execute callback when the user place the pointer over the entity
   * @param pointerData - Entity to attach the callback - Opts to trigger Feedback and Button
   * @param cb - Function to execute when click fires
   */
  onPointerHoverEnter(
    pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> },
    cb: EventSystemCallback
  ): void

  /**
   * @public
   * Execute callback when the user take the pointer out of the entity
   * @param pointerData - Entity to attach the callback - Opts to trigger Feedback and Button
   * @param cb - Function to execute when click fires
   */
  onPointerHoverLeave(
    pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> },
    cb: EventSystemCallback
  ): void

  /**
   * @public
   * Execute callback when the user presses the proximity button on the entity
   * @param pointerData - Entity to attach the callback - Opts to trigger Feedback and Button
   * @param cb - Function to execute when click fires
   */
  onProximityDown(pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> }, cb: EventSystemCallback): void

  /**
   * @public
   * Execute callback when the user releases the proximity button on the entity
   * @param pointerData - Entity to attach the callback - Opts to trigger Feedback and Button
   * @param cb - Function to execute when event fires
   */
  onProximityUp(pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> }, cb: EventSystemCallback): void

  /**
   * @public
   * Execute callback when the entity enters the proximity zone of the user
   * @param pointerData - Entity to attach the callback - Opts to trigger Feedback and Button
   * @param cb - Function to execute when event fires
   */
  onProximityEnter(pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> }, cb: EventSystemCallback): void

  /**
   * @public
   * Execute callback when the entity leaves the proximity zone of the user
   * @param pointerData - Entity to attach the callback - Opts to trigger Feedback and Button
   * @param cb - Function to execute when event fires
   */
  onProximityLeave(pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> }, cb: EventSystemCallback): void
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
    Up,
    HoverEnter,
    HoverLeave,
    ProximityEnter,
    ProximityLeave
  }
  type EventMapType = Map<string, { cb: EventSystemCallback; opts: EventSystemOptions; eventType: EventType }>

  const eventsMap = new Map<Entity, EventMapType>()

  function getEvent(entity: Entity) {
    return eventsMap.get(entity) || eventsMap.set(entity, new Map()).get(entity)!
  }

  // A cursor handler and a proximity handler are separate registrations that
  // produce separate PointerEvents entries, so they need separate slots here
  // too. Keying on the event type alone made onProximityDown evict whatever
  // onPointerDown had left.
  function eventKey(type: EventType, interactionType: InteractionType) {
    return `${type}:${interactionType}`
  }

  function setEvent(
    entity: Entity,
    type: EventType,
    cb: EventSystemCallback,
    opts: EventSystemOptions,
    interactionType: InteractionType = InteractionType.CURSOR
  ) {
    getEvent(entity).set(eventKey(type, interactionType), { cb, opts, eventType: type })
  }

  function setPointerEvent(
    entity: Entity,
    type: PointerEventType,
    opts: EventSystemOptions,
    interactionType: InteractionType = InteractionType.CURSOR
  ) {
    const pointerEvent = PointerEvents.getMutableOrNull(entity) || PointerEvents.create(entity)
    pointerEvent.pointerEvents.push({
      eventType: type,
      eventInfo: {
        button: opts.button,
        showFeedback: opts.showFeedback,
        showHighlight: opts.showHighlight,
        hoverText: opts.hoverText,
        maxDistance: opts.maxDistance,
        maxPlayerDistance: opts.maxPlayerDistance,
        priority: opts.priority,
        maxCameraDistance: opts.maxCameraDistance
      },
      interactionType: interactionType ?? InteractionType.CURSOR
    })
  }

  function removePointerEvent(
    entity: Entity,
    type: PointerEventType,
    button: InputAction,
    interactionType: InteractionType = InteractionType.CURSOR
  ) {
    const pointerEvent = PointerEvents.getMutableOrNull(entity)
    if (!pointerEvent) return

    // One registration pushed one entry, so drop one. Removing every match
    // would also take out an entry another registration owns, since onClick and
    // onPointerDown both describe themselves as PET_DOWN.
    const index = pointerEvent.pointerEvents.findIndex(
      (pointer) =>
        pointer.eventInfo?.button === button &&
        pointer.eventType === type &&
        pointer.interactionType === interactionType
    )
    if (index === -1) return

    pointerEvent.pointerEvents = pointerEvent.pointerEvents.filter((_, current) => current !== index)
  }

  function getPointerEvent(eventType: EventType) {
    if (eventType === EventType.Up) {
      return PointerEventType.PET_UP
    } else if (eventType === EventType.HoverLeave) {
      return PointerEventType.PET_HOVER_LEAVE
    } else if (eventType === EventType.HoverEnter) {
      return PointerEventType.PET_HOVER_ENTER
    } else if (eventType === EventType.ProximityEnter) {
      return PointerEventType.PET_PROXIMITY_ENTER
    } else if (eventType === EventType.ProximityLeave) {
      return PointerEventType.PET_PROXIMITY_LEAVE
    }
    return PointerEventType.PET_DOWN
  }

  function removeEvent(entity: Entity, type: EventType, interactionType: InteractionType = InteractionType.CURSOR) {
    const event = getEvent(entity)
    const key = eventKey(type, interactionType)
    const pointerEvent = event.get(key)

    // Every registration adds an entry, not only the ones carrying a hoverText,
    // so every removal has to take one away. Gating on hoverText left the
    // renderer showing an interaction whose callback was already gone, and made
    // re-registering grow the component by one entry each time.
    if (pointerEvent) {
      removePointerEvent(entity, getPointerEvent(type), pointerEvent.opts.button, interactionType)
    }

    event.delete(key)
  }

  engine.addSystem(function PointerEventSystem() {
    for (const [entity, event] of eventsMap) {
      if (engine.getEntityState(entity) === EntityState.Removed) {
        eventsMap.delete(entity)
        continue
      }

      for (const [, { cb, opts, eventType }] of event) {
        if (eventType === EventType.Click) {
          const command = inputSystem.getClick(opts.button, entity)
          if (command)
            checkNotThenable(cb(command.up), 'Click event returned a thenable. Only synchronous functions are allowed')
        }

        if (
          eventType === EventType.Down ||
          eventType === EventType.Up ||
          eventType === EventType.HoverEnter ||
          eventType === EventType.HoverLeave ||
          eventType === EventType.ProximityEnter ||
          eventType === EventType.ProximityLeave
        ) {
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
    setEvent(entity, EventType.Down, cb, options)
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
    setEvent(entity, EventType.Up, cb, options)
    setPointerEvent(entity, PointerEventType.PET_UP, options)
  }

  const onPointerHoverEnter: PointerEventsSystem['onPointerHoverEnter'] = (...args) => {
    const [data, cb] = args
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.HoverEnter)
    setEvent(entity, EventType.HoverEnter, cb, options)
    setPointerEvent(entity, PointerEventType.PET_HOVER_ENTER, options)
  }

  const onPointerHoverLeave: PointerEventsSystem['onPointerHoverLeave'] = (...args) => {
    const [data, cb] = args
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.HoverLeave)
    setEvent(entity, EventType.HoverLeave, cb, options)
    setPointerEvent(entity, PointerEventType.PET_HOVER_LEAVE, options)
  }

  const onProximityDown: PointerEventsSystem['onProximityDown'] = (...args) => {
    const [data, cb] = args
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.Down, InteractionType.PROXIMITY)
    setEvent(entity, EventType.Down, cb, options, InteractionType.PROXIMITY)
    setPointerEvent(entity, PointerEventType.PET_DOWN, options, InteractionType.PROXIMITY)
  }

  const onProximityUp: PointerEventsSystem['onProximityUp'] = (...args) => {
    const [data, cb] = args
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.Up, InteractionType.PROXIMITY)
    setEvent(entity, EventType.Up, cb, options, InteractionType.PROXIMITY)
    setPointerEvent(entity, PointerEventType.PET_UP, options, InteractionType.PROXIMITY)
  }

  const onProximityEnter: PointerEventsSystem['onProximityEnter'] = (...args) => {
    const [data, cb] = args
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.ProximityEnter, InteractionType.PROXIMITY)
    setEvent(entity, EventType.ProximityEnter, cb, options, InteractionType.PROXIMITY)
    setPointerEvent(entity, PointerEventType.PET_PROXIMITY_ENTER, options, InteractionType.PROXIMITY)
  }

  const onProximityLeave: PointerEventsSystem['onProximityLeave'] = (...args) => {
    const [data, cb] = args
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.ProximityLeave, InteractionType.PROXIMITY)
    setEvent(entity, EventType.ProximityLeave, cb, options, InteractionType.PROXIMITY)
    setPointerEvent(entity, PointerEventType.PET_PROXIMITY_LEAVE, options, InteractionType.PROXIMITY)
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

    removeOnPointerHoverEnter(entity: Entity) {
      removeEvent(entity, EventType.HoverEnter)
    },

    removeOnPointerHoverLeave(entity: Entity) {
      removeEvent(entity, EventType.HoverLeave)
    },

    removeOnProximityDown(entity: Entity) {
      removeEvent(entity, EventType.Down, InteractionType.PROXIMITY)
    },

    removeOnProximityUp(entity: Entity) {
      removeEvent(entity, EventType.Up, InteractionType.PROXIMITY)
    },

    removeOnProximityEnter(entity: Entity) {
      removeEvent(entity, EventType.ProximityEnter, InteractionType.PROXIMITY)
    },

    removeOnProximityLeave(entity: Entity) {
      removeEvent(entity, EventType.ProximityLeave, InteractionType.PROXIMITY)
    },

    onClick(value, cb) {
      const { entity } = value
      const options = getDefaultOpts(value.opts)
      // Clear previous event with over feedback included
      removeEvent(entity, EventType.Click)

      // Set new event
      setEvent(entity, EventType.Click, cb, options)
      setPointerEvent(entity, PointerEventType.PET_DOWN, options)
    },

    onPointerDown,
    onPointerUp,
    onPointerHoverEnter,
    onPointerHoverLeave,
    onProximityDown,
    onProximityUp,
    onProximityEnter,
    onProximityLeave
  }
}
