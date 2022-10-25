import { InputAction } from '../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { PointerEventType } from '../components/generated/pb/decentraland/sdk/components/pointer_hover_feedback.gen'
import { PBPointerEventsResult_PointerCommand } from '../components/generated/pb/decentraland/sdk/components/pointer_events_result.gen'
import { Schemas } from '../schemas'
import { Entity } from './entity'
import { IEngine } from './types'

/**
 * @public
 */
export type IInput = {
  /**
   * Check if a click was emmited in the current tick for the input action.
   * This is defined when an UP event is triggered with a previously DOWN state.
   * @param inputAction - the input action to query
   * @param entity - the entity to query, ignore for global events.
   * @returns true if the entity was clicked in the last tick-update
   */
  wasJustClicked: (inputAction: InputAction, entity?: Entity) => boolean

  /**
   * Check if a pointer event has been emited in the last tick-update.
   * @param inputAction - the input action to query
   * @param pointerEventType - the pointer event type to query
   * @param entity - the entity to query, ignore for global
   * @returns
   */
  wasInputJustActive: (
    inputAction: InputAction,
    pointerEventType: PointerEventType,
    entity?: Entity
  ) => boolean

  /**
   * Check if an input action is in DOWN state.
   * @param inputAction - the input action to query
   * @returns true if the input action is being pressed
   */
  isActionDown: (inputAction: InputAction) => boolean

  /**
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
   * Get the input command info if a pointer event has been emited in the last tick-update.
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

const LastInputAction = InputAction.IA_ACTION_6

const InternalInputStateComponentId = 1500
const TimestampUpdateSystemPriority = 1 << 20
const ButtonStateUpdateSystemPriority = 0

export function createInput(engine: IEngine): IInput {
  const InternalInputStateComponent = engine.defineComponent(
    InternalInputStateSchema,
    InternalInputStateComponentId
  )

  InternalInputStateComponent.create(engine.RootEntity, {
    buttonState: Array.from({ length: LastInputAction + 1 }, () => ({
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
    const up = findLastAction(
      commands,
      PointerEventType.PET_UP,
      inputAction,
      entity
    )

    if (!down) return null
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
  ) {
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

  function wasJustClicked(inputAction: InputAction, entity?: Entity) {
    return getClick(inputAction, entity) !== null
  }

  function wasInputJustActive(
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
    isActionDown,
    getClick,
    getInputCommand,
    wasJustClicked,
    wasInputJustActive
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
