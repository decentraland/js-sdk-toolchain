import { Vector3 } from '@dcl/ecs-math'

import { InputEventType } from './Types'
import { Component, DisposableComponent } from '../ecs/Component'

/** @public */
export type InputEventKind = 'BUTTON_DOWN' | 'BUTTON_UP'

/**
 * @public
 */
export enum ActionButton {
  POINTER = 'POINTER',
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  ANY = 'ANY',
  FORWARD = 'FORWARD',
  BACKWARD = 'BACKWARD',
  RIGHT = 'RIGHT',
  LEFT = 'LEFT',
  JUMP = 'JUMP',
  WALK = 'WALK',
  ACTION_3 = 'ACTION_3',
  ACTION_4 = 'ACTION_4',
  ACTION_5 = 'ACTION_5',
  ACTION_6 = 'ACTION_6'
}

/** @public */
export type InputState = Record<
  ActionButton,
  {
    BUTTON_DOWN: boolean
  }
>

/** @public */
export type LocalActionButtonEvent = GlobalInputEventResult & {
  origin: Vector3
  direction: Vector3
  button: ActionButton
  hit?: GlobalInputEventResult['hit'] & {
    hitPoint: Vector3
    normal: Vector3
    worldNormal: Vector3
  }
}

/**
 * @public
 */
export class PointerEventComponent {
  constructor(
    public readonly callback: (event: LocalActionButtonEvent) => void
  ) {
    if (!callback || !('apply' in callback) || !('call' in callback)) {
      throw new Error('Callback is not a function')
    }
    Input.ensureInstance()
  }
}

/**
 * @public
 */
@Component('pointerDown')
export class GlobalPointerDown extends PointerEventComponent {}

/**
 * @public
 */
@Component('pointerUp')
export class GlobalPointerUp extends PointerEventComponent {}

/**
 * @public
 */
export class Subscription {
  public fn: (e: LocalActionButtonEvent) => void
  public useRaycast: boolean

  constructor(fn: (e: LocalActionButtonEvent) => void, useRaycast: boolean) {
    this.fn = fn
    this.useRaycast = useRaycast
  }
}

/**
 * @public
 */
export class Input {
  private static _instance: Input

  // @internal
  private buttonIdMapping: ActionButton[] = [
    ActionButton.POINTER,
    ActionButton.PRIMARY,
    ActionButton.SECONDARY,
    ActionButton.ANY,
    ActionButton.FORWARD,
    ActionButton.BACKWARD,
    ActionButton.RIGHT,
    ActionButton.LEFT,
    ActionButton.JUMP,
    ActionButton.WALK,
    ActionButton.ACTION_3,
    ActionButton.ACTION_4,
    ActionButton.ACTION_5,
    ActionButton.ACTION_6
  ]

  static get instance(): Input {
    Input.ensureInstance()
    return Input._instance
  }

  // @internal
  private subscriptions: Record<
    ActionButton,
    Record<InputEventKind, Array<Subscription>>
  > = this.buttonIdMapping.reduce(
    (acc, k) => ({ ...acc, [k]: { BUTTON_DOWN: [], BUTTON_UP: [] } }),
    {} as Record<ActionButton, Record<InputEventKind, Array<Subscription>>>
  )

  private internalState: InputState = this.buttonIdMapping.reduce(
    (acc, k) => ({ ...acc, [k]: { BUTTON_DOWN: false } }),
    {} as InputState
  )

  private constructor() {}

  static ensureInstance(): any {
    if (!Input._instance) {
      Input._instance = new Input()
    }
  }

  /**
   * Allows to know if a button is pressed
   *
   * Returns true if the button is pressed
   * @param buttonId - The id of the button.
   */
  public isButtonPressed(buttonId: ActionButton) {
    return this.internalState[buttonId]
  }

  /**
   * Subscribes to an input event and triggers the provided callback.
   *
   * Returns a function that can be called to remove the subscription.
   * @param eventName - The name of the event (see InputEventKind).
   * @param buttonId - The id of the button.
   * @param useRaycast - Enables getting raycast information.
   * @param fn - A callback function to be called when the event is triggered.
   */
  public subscribe(
    eventName: InputEventKind,
    buttonId: ActionButton,
    useRaycast: boolean,
    fn: (e: LocalActionButtonEvent) => void
  ): () => void {
    this.subscriptions[buttonId][eventName].push(
      new Subscription(fn, useRaycast)
    )
    return () => {
      this.unsubscribe(eventName, buttonId, fn)
    }
  }

  /**
   * Removes an existing input event subscription.
   * @param eventName - The name of the event (see InputEventKind).
   * @param buttonId - The id of the button.
   * @param fn - The callback function used when subscribing to the event.
   */
  public unsubscribe(
    eventName: InputEventKind,
    buttonId: ActionButton,
    fn: (e: LocalActionButtonEvent) => void
  ) {
    const index = this.getSubscriptionId(eventName, buttonId, fn)
    if (index > -1) {
      return this.subscriptions[buttonId][eventName].splice(index, 1)
    }
    return false
  }

  public handlePointerEvent(data: GlobalInputEventResult) {
    const button = this.getPointerById(data.buttonId)

    if (!button) {
      return
    }

    const eventResult: LocalActionButtonEvent = {
      ...data,
      button,
      direction: new Vector3().copyFrom(data.direction),
      origin: new Vector3().copyFrom(data.origin),
      hit: undefined
    }

    const hit = data.hit
      ? {
          ...data.hit,
          hitPoint: new Vector3().copyFrom(data.hit.hitPoint),
          normal: new Vector3().copyFrom(data.hit.normal),
          worldNormal: new Vector3().copyFrom(data.hit.worldNormal)
        }
      : undefined

    if (data.type === InputEventType.DOWN) {
      this.internalState[button].BUTTON_DOWN = true

      for (
        let i = 0;
        i < this.subscriptions[button]['BUTTON_DOWN'].length;
        i++
      ) {
        const subscription = this.subscriptions[button]['BUTTON_DOWN'][i]

        // remove hit information when raycast is disabled
        if (subscription.useRaycast) {
          eventResult.hit = hit
        } else {
          eventResult.hit = undefined
        }

        subscription.fn(eventResult)
      }

      if (hit && hit.entityId && DisposableComponent.engine) {
        const entity = DisposableComponent.engine.entities[hit.entityId]
        const handler = entity && entity.getComponentOrNull(GlobalPointerDown)
        if (handler) {
          eventResult.hit = hit
          handler.callback(eventResult)
        }
      }
    } else {
      this.internalState[button].BUTTON_DOWN = false

      for (let i = 0; i < this.subscriptions[button]['BUTTON_UP'].length; i++) {
        const subscription = this.subscriptions[button]['BUTTON_UP'][i]

        // remove hit information when raycast is disabled
        if (subscription.useRaycast) {
          eventResult.hit = hit
        } else {
          eventResult.hit = undefined
        }

        subscription.fn(eventResult)
      }

      if (hit && hit.entityId && DisposableComponent.engine) {
        const entity = DisposableComponent.engine.entities[hit.entityId]
        const handler = entity && entity.getComponentOrNull(GlobalPointerUp)
        if (handler) {
          eventResult.hit = hit
          handler.callback(eventResult)
        }
      }
    }
  }

  private getSubscriptionId(
    eventName: InputEventKind,
    buttonId: ActionButton,
    fn: (e: LocalActionButtonEvent) => void
  ): number {
    for (let i = 0; i < this.subscriptions[buttonId][eventName].length; i++) {
      if (this.subscriptions[buttonId][eventName][i].fn === fn) {
        return i
      }
    }

    return -1
  }

  private getPointerById(id: number): ActionButton | null {
    if (id < 0 || id >= this.buttonIdMapping.length) {
      return null
    }

    const actionButton = this.buttonIdMapping[id]

    if (actionButton === ActionButton.ANY) {
      return null
    }

    return actionButton
  }
}
