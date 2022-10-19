import { Entity } from './entity'
import { PBPointerEventsResult_PointerCommand } from '../components/generated/pb/decentraland/sdk/components/pointer_events_result.gen'
import { PointerEventType } from '../components/generated/pb/decentraland/sdk/components/pointer_events.gen'
import { InputAction } from '../components/generated/pb/decentraland/sdk/components/common/input_action.gen'
import { IEngine } from './types'
import { Schemas } from '../schemas'

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

export type IInput = {
  /**
   * Check if a click was emmited in the current tick for the input action.
   * This is defined when an UP event is triggered with a previously DOWN state.
   * @param inputAction the input action to query
   * @param entity the entity to query, ignore for global events.
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
}

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

  function wasJustClicked(inputAction: InputAction, entity?: Entity) {
    const component = engine.baseComponents.PointerEventsResult.getOrNull(
      engine.RootEntity
    )

    if (!component) return false

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

    if (!down) return false
    if (!up) return false

    const state = InternalInputStateComponent.get(engine.RootEntity)

    // If the DOWN command has happen before the UP commands, it means that that a clicked has happen
    if (
      down.timestamp < up.timestamp &&
      up.timestamp > state.timestampLastUpdate
    ) {
      InternalInputStateComponent.getMutable(
        engine.RootEntity
      ).currentTimestamp = Math.max(up.timestamp, state.currentTimestamp)
      return true // clicked
    }
    return false
  }

  function wasInputJustActive(
    inputAction: InputAction,
    pointerEventType: PointerEventType,
    entity?: Entity
  ) {
    const component = engine.baseComponents.PointerEventsResult.getOrNull(
      engine.RootEntity
    )
    if (!component) return false

    // We search the last pointer Event command sorted by timestamp
    const command = findLastAction(
      component.commands,
      pointerEventType,
      inputAction,
      entity
    )
    if (!command) return false

    const state = InternalInputStateComponent.get(engine.RootEntity)
    if (command.timestamp > state.timestampLastUpdate) {
      InternalInputStateComponent.getMutable(
        engine.RootEntity
      ).currentTimestamp = Math.max(command.timestamp, state.currentTimestamp)
      return true // up component is from an old click
    } else {
      return false
    }
  }

  function isActionDown(inputAction: InputAction) {
    return InternalInputStateComponent.get(engine.RootEntity).buttonState[
      inputAction
    ].value
  }

  return {
    isActionDown,
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
