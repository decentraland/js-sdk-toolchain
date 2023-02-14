import * as components from '../components'
import { InputAction } from '../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { PointerEventType } from '../components/generated/pb/decentraland/sdk/components/pointer_events.gen'
import { PBPointerEventsResult } from '../components/generated/pb/decentraland/sdk/components/pointer_events_result.gen'
import { Schemas } from '../schemas'
import { Entity } from './entity'
import { DeepReadonly } from './readonly'
import { IEngine } from './types'

const InputCommands: InputAction[] = [
  InputAction.IA_POINTER,
  InputAction.IA_PRIMARY,
  InputAction.IA_SECONDARY,
  InputAction.IA_FORWARD,
  InputAction.IA_BACKWARD,
  InputAction.IA_RIGHT,
  InputAction.IA_LEFT,
  InputAction.IA_JUMP,
  InputAction.IA_WALK,
  InputAction.IA_ACTION_3,
  InputAction.IA_ACTION_4,
  InputAction.IA_ACTION_5,
  InputAction.IA_ACTION_6
]
/**
 * @public
 */
export type IInputSystem = {
  /**
   * @internal
   * Check if a click was emmited in the current tick for the input action.
   * This is defined when an UP event is triggered with a previously DOWN state.
   * @param inputAction - the input action to query
   * @param entity - the entity to query, ignore for global events.
   * @returns true if the entity was clicked in the last tick-update
   */
  isClicked: (inputAction: InputAction, entity: Entity) => boolean

  /**
   * @public
   * Check if a pointer event has been emitted in the last tick-update.
   * @param inputAction - the input action to query
   * @param pointerEventType - the pointer event type to query
   * @param entity - the entity to query, ignore for global
   * @returns boolean
   */
  isTriggered: (inputAction: InputAction, pointerEventType: PointerEventType, entity?: Entity) => boolean

  /**
   * @public
   * Check if an input action is currently being pressed.
   * @param inputAction - the input action to query
   * @returns boolean
   */
  isPressed: (inputAction: InputAction) => boolean

  /**
   * @internal
   * Get the click info if a click was emmited in the current tick for the input action.
   * This is defined when an UP event is triggered with a previously DOWN state.
   * @param inputAction - the input action to query
   * @param entity - the entity to query, ignore for global events.
   * @returns the click info or undefined if there is no command in the last tick-update
   */
  getClick: (
    inputAction: InputAction,
    entity?: Entity
  ) => {
    up: PBPointerEventsResult
    down: PBPointerEventsResult
  } | null

  /**
   * @public
   * Get the input command info if a pointer event has been emitted in the last tick-update.
   * @param inputAction - the input action to query
   * @param pointerEventType - the pointer event type to query
   * @param entity - the entity to query, ignore for global
   * @returns the input command info or undefined if there is no command in the last tick-update
   */
  getInputCommand: (
    inputAction: InputAction,
    pointerEventType: PointerEventType,
    entity: Entity
  ) => PBPointerEventsResult | null
}

const InternalInputStateSchema = {
  timestampLastUpdate: Schemas.Number,
  currentTimestamp: Schemas.Number,
  buttonState: Schemas.Array(
    Schemas.Map({
      value: Schemas.Boolean,
      ts: Schemas.Number
    })
  )
}

const TimestampUpdateSystemPriority = 1 << 20
const ButtonStateUpdateSystemPriority = 0

/**
 * @internal
 */
export function createInputSystem(engine: IEngine): IInputSystem {
  const PointerEventsResult = components.PointerEventsResult(engine)
  const InternalInputStateComponent = engine.defineComponent(
    '@dcl/sdk/InternalInputStateSchema',
    InternalInputStateSchema
  )

  InternalInputStateComponent.create(engine.RootEntity, {
    buttonState: Array.from({ length: InputCommands.length }, () => ({
      ts: 0,
      value: false
    }))
  })

  function timestampUpdateSystem() {
    const state = InternalInputStateComponent.get(engine.RootEntity)
    if (state.currentTimestamp > state.timestampLastUpdate) {
      InternalInputStateComponent.getMutable(engine.RootEntity).timestampLastUpdate = state.currentTimestamp
    }
  }

  function findLastAction(
    pointerEventType: PointerEventType,
    inputAction: InputAction,
    entity: Entity
  ): PBPointerEventsResult | undefined {
    const ascendingTimestampIterator = PointerEventsResult.get(entity)
    for (const command of Array.from(ascendingTimestampIterator).reverse()) {
      if (command.button === inputAction && command.state === pointerEventType) {
        return command
      }
    }
  }

  function* findCommandsByActionDescending(
    inputAction: InputAction,
    entity: Entity
  ): Iterable<DeepReadonly<PBPointerEventsResult>> {
    const ascendingTimestampIterator = PointerEventsResult.get(entity)
    for (const command of Array.from(ascendingTimestampIterator).reverse()) {
      if (command.button === inputAction) {
        yield command
      }
    }
  }

  function buttonStateUpdateSystem() {
    const globalState = InternalInputStateComponent.getMutable(engine.RootEntity)

    for (const [, commands] of engine.getEntitiesWith(PointerEventsResult)) {
      for (const command of Array.from(commands).reverse()) {
        if (command.timestamp > globalState.buttonState[command.button].ts) {
          if (command.state === PointerEventType.PET_DOWN) {
            globalState.buttonState[command.button].value = true
          } else if (command.state === PointerEventType.PET_UP) {
            globalState.buttonState[command.button].value = false
          }
        } else {
          break
        }
      }
    }
  }

  engine.addSystem(buttonStateUpdateSystem, ButtonStateUpdateSystemPriority, '@dcl/ecs#buttonStateUpdateSystem')
  engine.addSystem(timestampUpdateSystem, TimestampUpdateSystemPriority, '@dcl/ecs#timestampUpdateSystem')

  function getClick(inputAction: InputAction, entity?: Entity) {
    if (inputAction !== InputAction.IA_ANY) {
      return findClick(inputAction, entity ?? engine.RootEntity)
    }

    for (const input of InputCommands) {
      const cmd = findClick(input, entity ?? engine.RootEntity)
      if (cmd) return cmd
    }
    return null
  }

  function findClick(inputAction: InputAction, entity: Entity) {
    let down: PBPointerEventsResult | null = null
    let up: PBPointerEventsResult | null = null

    // We search the last UP & DOWN command sorted by timestamp descending
    for (const it of findCommandsByActionDescending(inputAction, entity)) {
      if (!up) {
        if (it.state === PointerEventType.PET_UP) {
          up = it
          continue
        }
      } else if (!down) {
        if (it.state === PointerEventType.PET_DOWN) {
          down = it
          continue
        }
      }
    }

    if (!up || !down) return null

    const state = InternalInputStateComponent.get(engine.RootEntity)

    // If the DOWN command has happen before the UP commands, it means that that a clicked has happen
    if (down.timestamp < up.timestamp && up.timestamp > state.timestampLastUpdate) {
      InternalInputStateComponent.getMutable(engine.RootEntity).currentTimestamp = Math.max(
        up.timestamp,
        state.currentTimestamp
      )
      return { up, down }
    }
    return null
  }

  function getInputCommand(
    inputAction: InputAction,
    pointerEventType: PointerEventType,
    entity: Entity
  ): PBPointerEventsResult | null {
    if (inputAction !== InputAction.IA_ANY) {
      return findInputCommand(inputAction, pointerEventType, entity)
    }

    for (const input of InputCommands) {
      const cmd = findInputCommand(input, pointerEventType, entity)
      if (cmd) return cmd
    }
    return null
  }

  function findInputCommand(
    inputAction: InputAction,
    pointerEventType: PointerEventType,
    entity: Entity
  ): PBPointerEventsResult | null {
    // We search the last pointer Event command sorted by timestamp
    const command = findLastAction(pointerEventType, inputAction, entity)
    if (!command) return null

    const state = InternalInputStateComponent.get(engine.RootEntity)
    if (command.timestamp > state.timestampLastUpdate) {
      InternalInputStateComponent.getMutable(engine.RootEntity).currentTimestamp = Math.max(
        command.timestamp,
        state.currentTimestamp
      )
      return command
    } else {
      return null
    }
  }

  function isClicked(inputAction: InputAction, entity: Entity) {
    return getClick(inputAction, entity) !== null
  }

  function isTriggered(inputAction: InputAction, pointerEventType: PointerEventType, entity?: Entity) {
    return getInputCommand(inputAction, pointerEventType, entity || engine.RootEntity) !== null
  }

  function isPressed(inputAction: InputAction) {
    return InternalInputStateComponent.get(engine.RootEntity).buttonState[inputAction].value
  }

  return {
    // @public
    isPressed,
    // @internal
    getClick,
    // @public
    getInputCommand,
    // @internal
    isClicked,
    // @public
    isTriggered
  }
}
