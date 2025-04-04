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

/**
 * @public
 */
export type EventSystemOptionsCallback = EventSystemOptions & { cb: EventSystemCallback }

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
   * Execute callbacks when the user presses one of the InputButtons pointing at the entity
   * @param pointerData - Entity to attach the callbacks, list of options to trigger Feedback, Button, and Callback
   */
  onPointerDown(pointerData: { entity: Entity; optsList: EventSystemOptionsCallback[] }): void
  /**
   * @public
   * Execute callback when the user press the InputButton pointing at the entity
   * @param pointerData - Entity to attach the callback, Opts to trigger Feedback and Button
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
   * Execute callbacks when the user releases one of the InputButtons pointing at the entity
   * @param pointerData - Entity to attach the callbacks, list of options to trigger Feedback, Button, and Callback
   */
  onPointerUp(pointerData: { entity: Entity; optsList: EventSystemOptionsCallback[] }): void
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
   * Execute callbacks when the user drags the pointer from inside the entity
   * @param pointerData - Entity to attach the callbacks, list of options to trigger Feedback, Button, and Callback
   */
  onPointerDrag(pointerData: { entity: Entity; optsList: EventSystemOptionsCallback[] }): void
  /**
   * @public
   * Execute callback when the user clicks and drags the pointer from inside the entity
   * @param pointerData - Entity to attach the callback - Opts to trigger Feedback and Button
   * @param cb - Function to execute when click fires
   */
  onPointerDrag(pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> }, cb: EventSystemCallback): void

  /**
   * @public
   * Execute callbacks when the user drags the pointer from inside the entity, locking the cursor in place.
   * @param pointerData - Entity to attach the callbacks, list of options to trigger Feedback, Button, and Callback
   */
  onPointerDragLocked(pointerData: { entity: Entity; optsList: EventSystemOptionsCallback[] }): void
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
   * Execute callbacks when the user releases a button after a drag
   * @param pointerData - Entity to attach the callbacks, list of options to trigger Feedback, Button, and Callback
   */
  onPointerDragEnd(pointerData: { entity: Entity; optsList: EventSystemOptionsCallback[] }): void
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
  type EventMapType = Map<EventType, Map<InputAction, EventSystemOptionsCallback>>

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

  function getEventType(pet: PointerEventType) {
    if (pet === PointerEventType.PET_UP) {
      return EventType.Up
    } else if (pet === PointerEventType.PET_HOVER_ENTER) {
      return EventType.HoverEnter
    } else if (pet === PointerEventType.PET_HOVER_LEAVE) {
      return EventType.HoverLeave
    } else if (pet === PointerEventType.PET_DRAG) {
      return EventType.Drag
    } else if (pet === PointerEventType.PET_DRAG_LOCKED) {
      return EventType.DragLocked
    } else if (pet === PointerEventType.PET_DRAG_END) {
      return EventType.DragEnd
    } else {
      return EventType.Down
    }
  }

  function removeEvent(entity: Entity, type: EventType) {
    const event = getEvent(entity)
    const pointerEventList = event.get(type)

    if (pointerEventList === undefined) {
      return;
    }

    for (const button of pointerEventList.keys()) {
      removePointerEvent(entity, getPointerEvent(type), button)
    }

    event.delete(type)
  }

  engine.addSystem(function EventSystem() {
    if (eventsMap.size === 0) {
      return;
    }

    for (const entity of eventsMap.keys()) {
      if (engine.getEntityState(entity) === EntityState.Removed) {
        eventsMap.delete(entity)
      }
    }

    for (const command of inputSystem.getInputCommands()) {
      const entity = command.hit?.entityId as Entity;
      if (entity === undefined) {
        continue;
      }

      const entityMap = eventsMap.get(entity);
      if (entityMap === undefined) {
        continue;
      }

      const typeMap = entityMap.get(getEventType(command.state))
      if (typeMap) {
        const data = typeMap.get(command.button)
        if (data) {
          checkNotThenable(data.cb(command), 'Event handler returned a thenable. Only synchronous functions are allowed')
        }

        const anyData = typeMap.get(InputAction.IA_ANY)
        if (anyData) {
          checkNotThenable(anyData.cb(command), 'Event handler returned a thenable. Only synchronous functions are allowed')
        }
      }

      // check clicks separately
      if (command.state == PointerEventType.PET_UP) {
        const clickMap = entityMap.get(EventType.Click)
        if (clickMap) {
          const data = clickMap.get(command.button)
          if (data && inputSystem.getClick(command.button, entity)) {
            checkNotThenable(data.cb(command), 'Click event returned a thenable. Only synchronous functions are allowed')
          }

          const anyData = clickMap.get(InputAction.IA_ANY)
          if (anyData && inputSystem.getClick(command.button, entity)) {
            checkNotThenable(anyData.cb(command), 'Event handler returned a thenable. Only synchronous functions are allowed')
          }            
        }
      }
    }
  })

  // return a function with the correct event type.
  // we use onPointerDown as the "archetype" for the returned function, but it fits with
  // all the onPointer* declarations
  const onPointerFunction: (ty: EventType) => PointerEventsSystem['onPointerDown'] = (ty) => {
    return (
      arg0: Entity | { entity: Entity; opts?: Partial<EventSystemOptions> } | { entity: Entity; optsList: EventSystemOptionsCallback[] },
      arg1?: EventSystemCallback,
      arg2?: Partial<EventSystemOptions>
    ) => {
      var entity: Entity;
      var optsList: EventSystemOptionsCallback[];

      if (typeof arg0 === 'number') {
        // called as onPointerDown(entity: Entity, cb: EventSystemCallback, opts?: Partial<EventSystemOptions>): void
        entity = arg0
        const cb = arg1 as EventSystemCallback
        const opts = arg2
        optsList = [{ cb, ...getDefaultOpts(opts) }]
      } else if (typeof arg1 === 'function') {
        // called as onPointerDown(pointerData: { entity: Entity; opts?: Partial<EventSystemOptions> }, cb: EventSystemCallback): void
        const { entity: e, opts } = arg0 as { entity: Entity; opts?: Partial<EventSystemOptions> }
        const cb = arg1 as EventSystemCallback
        entity = e
        optsList = [{ cb, ...getDefaultOpts(opts)}]
      } else {
        // called as onPointerDown(pointerData: { entity: Entity; optsList: EventSystemOptionsCallback[] }): void
        const { entity: e, optsList: o } = arg0 as { entity: Entity, optsList: EventSystemOptionsCallback[] }
        entity = e
        optsList = o
      }

      const previous = getEvent(entity).get(ty) ?? new Map<InputAction, EventSystemOptionsCallback>();

      const callbacks = new Map();
      for (const opts of optsList) {
        const prevOpts = previous.get(opts.button)
        if (prevOpts !== undefined) {
          if (prevOpts.hoverText !== opts.hoverText || prevOpts.maxDistance !== opts.maxDistance || prevOpts.showFeedback !== opts.showFeedback || prevOpts.showHighlight !== opts.showHighlight) {
            removePointerEvent(entity, getPointerEvent(ty), opts.button)
            setPointerEvent(entity, getPointerEvent(ty), opts)
          }
        } else {
          setPointerEvent(entity, getPointerEvent(ty), opts)
        }
        callbacks.set(opts.button, opts);
      }

      for (const button of previous.keys()) {
        if (!callbacks.has(button)) {
          removePointerEvent(entity, getPointerEvent(ty), button)
        }
      }

      getEvent(entity).set(ty, callbacks)
    }
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

    onClick: onPointerFunction(EventType.Click),
    onPointerDown: onPointerFunction(EventType.Down),
    onPointerUp: onPointerFunction(EventType.Up),
    onPointerHoverEnter: onPointerFunction(EventType.HoverEnter),
    onPointerHoverLeave: onPointerFunction(EventType.HoverLeave),
    onPointerDrag: onPointerFunction(EventType.Drag),
    onPointerDragLocked: onPointerFunction(EventType.DragLocked),
    onPointerDragEnd: onPointerFunction(EventType.DragEnd)
  }
}
