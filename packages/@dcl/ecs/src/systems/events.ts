import { InputAction } from '../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
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
   * Remove the callback for onPointerDrag event
   * @param entity - Entity where the callback was attached
   */
  removeOnPointerDrag(entity: Entity): void

  /**
   * @public
   * Remove the callback for onPointerDragLocked event
   * @param entity - Entity where the callback was attached
   */
  removeOnPointerDragLocked(entity: Entity): void

  /**
   * @public
   * Remove the callback for onPointerDragEnd event
   * @param entity - Entity where the callback was attached
   */
  removeOnPointerDragEnd(entity: Entity): void

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
   * Execute callback when the user clicks and drags the pointer from inside the entity
   * @param pointerData - Entity to attach the callback - Opts to trigger Feedback and Button
   * @param cb - Function to execute when click fires
   */
  onPointerDrag(pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> }, cb: EventSystemCallback): void

  /**
   * @public
   * Execute callback when the user clicks and drags the pointer from inside the entity,
   * locking the cursor in place
   * @param pointerData - Entity to attach the callback - Opts to trigger Feedback and Button
   * @param cb - Function to execute when click fires
   */
  onPointerDragLocked(
    pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> },
    cb: EventSystemCallback
  ): void

  /**
   * @public
   * Execute callback when the user releases the button after a drag
   * @param pointerData - Entity to attach the callback - Opts to trigger Feedback and Button
   * @param cb - Function to execute when click fires
   */
  onPointerDragEnd(pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> }, cb: EventSystemCallback): void
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
    Drag,
    DragLocked,
    DragEnd
  }
  type EventMapType = Map<EventType, { cb: EventSystemCallback; opts: EventSystemOptions }>

  const eventsMap = new Map<Entity, EventMapType>()

  function getEvent(entity: Entity) {
    return eventsMap.get(entity) || eventsMap.set(entity, new Map()).get(entity)!
  }

  function setPointerEvent(entity: Entity, type: PointerEventType, opts: EventSystemOptions) {
    const pointerEvent = PointerEvents.getMutableOrNull(entity) || PointerEvents.create(entity)
    pointerEvent.pointerEvents.push({
      eventType: type,
      eventInfo: {
        button: opts.button,
        showFeedback: opts.showFeedback,
        showHighlight: opts.showHighlight,
        hoverText: opts.hoverText,
        maxDistance: opts.maxDistance
      }
    })
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
    } else if (eventType === EventType.HoverLeave) {
      return PointerEventType.PET_HOVER_LEAVE
    } else if (eventType === EventType.HoverEnter) {
      return PointerEventType.PET_HOVER_ENTER
    } else if (eventType === EventType.Drag) {
      return PointerEventType.PET_DRAG
    } else if (eventType === EventType.DragLocked) {
      return PointerEventType.PET_DRAG_LOCKED
    } else if (eventType === EventType.DragEnd) {
      return PointerEventType.PET_DRAG_END
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

        if (
          eventType === EventType.Down ||
          eventType === EventType.Up ||
          eventType === EventType.HoverEnter ||
          eventType === EventType.HoverLeave ||
          eventType === EventType.Drag ||
          eventType === EventType.DragLocked ||
          eventType === EventType.DragEnd
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

  const onPointerHoverEnter: PointerEventsSystem['onPointerHoverEnter'] = (...args) => {
    const [data, cb] = args
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.HoverEnter)
    getEvent(entity).set(EventType.HoverEnter, { cb, opts: options })
    setPointerEvent(entity, PointerEventType.PET_HOVER_ENTER, options)
  }

  const onPointerHoverLeave: PointerEventsSystem['onPointerHoverLeave'] = (...args) => {
    const [data, cb] = args
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.HoverLeave)
    getEvent(entity).set(EventType.HoverLeave, { cb, opts: options })
    setPointerEvent(entity, PointerEventType.PET_HOVER_LEAVE, options)
  }

  const onPointerDrag: PointerEventsSystem['onPointerDrag'] = (...args) => {
    const [data, cb] = args
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.Drag)
    getEvent(entity).set(EventType.Drag, { cb, opts: options })
    setPointerEvent(entity, PointerEventType.PET_DRAG, options)
  }

  const onPointerDragLocked: PointerEventsSystem['onPointerDragLocked'] = (...args) => {
    const [data, cb] = args
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.DragLocked)
    getEvent(entity).set(EventType.DragLocked, { cb, opts: options })
    setPointerEvent(entity, PointerEventType.PET_DRAG_LOCKED, options)
  }

  const onPointerDragEnd: PointerEventsSystem['onPointerDragEnd'] = (...args) => {
    const [data, cb] = args
    const { entity, opts } = data
    const options = getDefaultOpts(opts)
    removeEvent(entity, EventType.DragEnd)
    getEvent(entity).set(EventType.DragEnd, { cb, opts: options })
    setPointerEvent(entity, PointerEventType.PET_DRAG_END, options)
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

    removeOnPointerDrag(entity: Entity) {
      removeEvent(entity, EventType.Drag)
    },

    removeOnPointerDragLocked(entity: Entity) {
      removeEvent(entity, EventType.DragLocked)
    },

    removeOnPointerDragEnd(entity: Entity) {
      removeEvent(entity, EventType.DragEnd)
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
    onPointerUp,
    onPointerHoverEnter,
    onPointerHoverLeave,
    onPointerDrag,
    onPointerDragLocked,
    onPointerDragEnd
  }
}
