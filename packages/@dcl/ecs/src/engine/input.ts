import { InputAction } from '../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { PointerEventType } from '../components/generated/pb/decentraland/sdk/components/pointer_hover_feedback.gen'
import { PBPointerEventsResult_PointerCommand } from '../components/generated/pb/decentraland/sdk/components/pointer_events_result.gen'
import { Schemas } from '../schemas'
import { Entity } from './entity'
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
export type IInput = {
  /**
   * @internal
   * Check if a click was emmited in the current tick for the input action.
   * This is defined when an UP event is triggered with a previously DOWN state.
   * @param inputAction - the input action to query
   * @param entity - the entity to query, ignore for global events.
   * @returns true if the entity was clicked in the last tick-update
   */
  isClicked: (inputAction: InputAction, entity?: Entity) => boolean

  /**
   * @public
   * Check if a pointer event has been emitted in the last tick-update.
   * @param inputAction - the input action to query
   * @param pointerEventType - the pointer event type to query
   * @param entity - the entity to query, ignore for global
   * @returns
   */
  isActive: (
    inputAction: InputAction,
    pointerEventType: PointerEventType,
    entity?: Entity
  ) => boolean

  /**
   * @public
   * Check if an input action is in DOWN state.
   * @param inputAction - the input action to query
   * @returns true if the input action is being pressed
   */
  isActionDown: (inputAction: InputAction) => boolean

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
    up: PBPointerEventsResult_PointerCommand
    down: PBPointerEventsResult_PointerCommand
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
    entity?: Entity
  ) => PBPointerEventsResult_PointerCommand | null
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

const InternalInputStateComponentId = 1500
const TimestampUpdateSystemPriority = 1 << 20
const ButtonStateUpdateSystemPriority = 0

export function createInput(engine: IEngine): IInput {
  const InternalInputStateComponent = engine.defineComponent(
    InternalInputStateSchema,
    InternalInputStateComponentId
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
      InternalInputStateComponent.getMutable(
        engine.RootEntity
      ).timestampLastUpdate = state.currentTimestamp
    }
  }

  function buttonStateUpdateSystem() {
    const component = engine.baseComponents.PointerEventsResult.getOrNull(
      engine.RootEntity
    )

    if (!component) return

    const state = InternalInputStateComponent.getMutable(engine.RootEntity)

    for (const command of component.commands) {
      if (command.timestamp > state.buttonState[command.button].ts) {
        if (command.state === PointerEventType.PET_DOWN) {
          state.buttonState[command.button].value = true
        } else if (command.state === PointerEventType.PET_UP) {
          state.buttonState[command.button].value = false
        }
      }
    }
  }

  engine.addSystem(buttonStateUpdateSystem, ButtonStateUpdateSystemPriority)
  engine.addSystem(timestampUpdateSystem, TimestampUpdateSystemPriority)

  function getClick(inputAction: InputAction, entity?: Entity) {
    if (inputAction !== InputAction.IA_ANY) {
      return findClick(inputAction, entity)
    }

    for (const input of InputCommands) {
      const cmd = findClick(input, entity)
      if (cmd) return cmd
    }
    return null
  }

  function findClick(inputAction: InputAction, entity?: Entity) {
    const component = engine.baseComponents.PointerEventsResult.getOrNull(
      engine.RootEntity
    )

    if (!component) return null
    const commands = component.commands

    // We search the last DOWN command sorted by timestamp
    const down = findLastAction(
      commands,
      PointerEventType.PET_DOWN,
      inputAction,
      entity
    )
    // We search the last UP command sorted by timestamp
    if (!down) return null

    const up = findLastAction(
      commands,
      PointerEventType.PET_UP,
      inputAction,
      entity
    )

    if (!up) return null

    const state = InternalInputStateComponent.get(engine.RootEntity)

    // If the DOWN command has happen before the UP commands, it means that that a clicked has happen
    if (
      down.timestamp < up.timestamp &&
      up.timestamp > state.timestampLastUpdate
    ) {
      InternalInputStateComponent.getMutable(
        engine.RootEntity
      ).currentTimestamp = Math.max(up.timestamp, state.currentTimestamp)
      return { up, down }
    }
    return null
  }

  function getInputCommand(
    inputAction: InputAction,
    pointerEventType: PointerEventType,
    entity?: Entity
  ): PBPointerEventsResult_PointerCommand | null {
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
    entity?: Entity
  ): PBPointerEventsResult_PointerCommand | null {
    const component = engine.baseComponents.PointerEventsResult.getOrNull(
      engine.RootEntity
    )
    if (!component) return null

    // We search the last pointer Event command sorted by timestamp
    const command = findLastAction(
      component.commands,
      pointerEventType,
      inputAction,
      entity
    )
    if (!command) return null

    const state = InternalInputStateComponent.get(engine.RootEntity)
    if (command.timestamp > state.timestampLastUpdate) {
      InternalInputStateComponent.getMutable(
        engine.RootEntity
      ).currentTimestamp = Math.max(command.timestamp, state.currentTimestamp)
      return command
    } else {
      return null
    }
  }

  function isClicked(inputAction: InputAction, entity?: Entity) {
    return getClick(inputAction, entity) !== null
  }

  function isActive(
    inputAction: InputAction,
    pointerEventType: PointerEventType,
    entity?: Entity
  ) {
    return getInputCommand(inputAction, pointerEventType, entity) !== null
  }

  function isActionDown(inputAction: InputAction) {
    return InternalInputStateComponent.get(engine.RootEntity).buttonState[
      inputAction
    ].value
  }

  return {
    // @public
    isActionDown,
    // @internal
    getClick,
    // @public
    getInputCommand,
    // @internal
    isClicked,
    // @public
    isActive
  }
}

function findLastAction(
  commands: readonly PBPointerEventsResult_PointerCommand[],
  pointerEventType: PointerEventType,
  inputAction: InputAction,
  entity?: Entity
): PBPointerEventsResult_PointerCommand | undefined {
  let commandToReturn: PBPointerEventsResult_PointerCommand | undefined =
    undefined

  for (const command of commands) {
    if (
      command.button === inputAction &&
      command.state === pointerEventType &&
      (!entity || (command.hit && entity === command.hit.entityId))
    ) {
      if (!commandToReturn || command.timestamp >= commandToReturn.timestamp)
        commandToReturn = command
    }
  }

  return commandToReturn
}
