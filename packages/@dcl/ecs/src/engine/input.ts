import { Entity } from './entity'
import { PBPointerEventsResult_PointerCommand } from '../components/generated/pb/ecs/components/PointerEventsResult.gen'
import { PointerEventType } from '../components/generated/pb/ecs/components/PointerEvents.gen'
import { ActionButton } from '../components/generated/pb/ecs/components/common/ActionButton.gen'
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

const LastActionButton = ActionButton.ACTION_6

const InternalInputStateComponentId = 1500
const TimestampUpdateSystemPriority = 1 << 20
const ButtonStateUpdateSystemPriority = 0

export function createInput(engine: IEngine) {
  const InternalInputStateComponent = engine.defineComponent(
    InternalInputStateSchema,
    InternalInputStateComponentId
  )

  InternalInputStateComponent.create(engine.RootEntity, {
    buttonState: Array.from({ length: LastActionButton + 1 }, () => ({
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
        if (command.state === PointerEventType.DOWN) {
          state.buttonState[command.button].value = true
        } else if (command.state === PointerEventType.UP) {
          state.buttonState[command.button].value = false
        }
      }
    }
  }

  engine.addSystem(buttonStateUpdateSystem, ButtonStateUpdateSystemPriority)
  engine.addSystem(timestampUpdateSystem, TimestampUpdateSystemPriority)

  function isClicked(actionButton: ActionButton, entity?: Entity) {
    const component = engine.baseComponents.PointerEventsResult.getOrNull(
      engine.RootEntity
    )

    if (!component) return false

    const commands = component.commands

    // We search the last DOWN command sorted by timestamp
    const down = findLastAction(
      commands,
      PointerEventType.DOWN,
      actionButton,
      entity
    )
    // We search the last UP command sorted by timestamp
    const up = findLastAction(
      commands,
      PointerEventType.UP,
      actionButton,
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

  function isInputActive(
    actionButton: ActionButton,
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
      actionButton,
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

  function isActionDown(actionButton: ActionButton) {
    return InternalInputStateComponent.get(engine.RootEntity).buttonState[
      actionButton
    ].value
  }

  return {
    isActionDown,
    isClicked,
    isInputActive
  }
}

function findLastAction(
  commands: readonly PBPointerEventsResult_PointerCommand[],
  pointerEventType: PointerEventType,
  actionButton: ActionButton,
  entity?: Entity
): PBPointerEventsResult_PointerCommand | undefined {
  let commandToReturn: PBPointerEventsResult_PointerCommand | undefined =
    undefined

  for (const command of commands) {
    if (
      command.button === actionButton &&
      command.state === pointerEventType &&
      (!entity || (command.hit && entity === command.hit.entityId))
    ) {
      if (!commandToReturn || command.timestamp >= commandToReturn.timestamp)
        commandToReturn = command
    }
  }

  return commandToReturn
}
