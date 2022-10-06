import { Entity } from './entity'
import { PBPointerEventsResult_PointerCommand } from '../components/generated/pb/ecs/components/PointerEventsResult.gen'
import { PointerEventType } from '../components/generated/pb/ecs/components/PointerEvents.gen'
import { ActionButton } from '../components/generated/pb/ecs/components/common/ActionButton.gen'
import { IEngine } from './types'
import { Schemas } from '../schemas'

const UpdateTimestampStateSchema = {
  timestampLastUpdate: Schemas.Number,
  currentTimestamp: Schemas.Number
}

const WasEntityClickComponentID = 1500
const IsPointerEventActiveComponentID = 1501
const EventSystemPriority = 1 << 20

export function wasEntityClickedGenerator(engine: IEngine) {
  const WasEntityClickComponentState = engine.defineComponent(
    UpdateTimestampStateSchema,
    WasEntityClickComponentID
  )

  WasEntityClickComponentState.create(engine.RootEntity)

  engine.addSystem(() => {
    const state = WasEntityClickComponentState.get(engine.RootEntity)
    if (state.currentTimestamp > state.timestampLastUpdate) {
      WasEntityClickComponentState.getMutable(
        engine.RootEntity
      ).timestampLastUpdate = state.currentTimestamp
    }
  }, EventSystemPriority)

  return function (entity: Entity, actionButton: ActionButton) {
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

    const state = WasEntityClickComponentState.get(engine.RootEntity)

    // If the DOWN command has happen before the UP commands, it means that that a clicked has happen
    if (
      down.timestamp < up.timestamp &&
      up.timestamp > state.timestampLastUpdate
    ) {
      WasEntityClickComponentState.getMutable(
        engine.RootEntity
      ).currentTimestamp = Math.max(up.timestamp, state.currentTimestamp)
      return true // clicked
    }
    return false
  }
}

export function isPointerEventActiveGenerator(engine: IEngine) {
  const IsPointerEventActiveComponentState = engine.defineComponent(
    UpdateTimestampStateSchema,
    IsPointerEventActiveComponentID
  )

  IsPointerEventActiveComponentState.create(engine.RootEntity)

  engine.addSystem(() => {
    const state = IsPointerEventActiveComponentState.get(engine.RootEntity)
    if (state.currentTimestamp > state.timestampLastUpdate) {
      IsPointerEventActiveComponentState.getMutable(
        engine.RootEntity
      ).timestampLastUpdate = state.currentTimestamp
    }
  }, EventSystemPriority)

  return function (
    entity: Entity,
    actionButton: ActionButton,
    pointerEventType: PointerEventType
  ) {
    const component = engine.baseComponents.PointerEventsResult.getOrNull(
      engine.RootEntity
    )

    if (!component) return false

    const commands = component.commands

    // We search the last pointer Event command sorted by timestamp
    const command = findLastAction(
      commands,
      pointerEventType,
      actionButton,
      entity
    )

    if (!command) return false

    const state = IsPointerEventActiveComponentState.get(engine.RootEntity)

    if (command.timestamp > state.timestampLastUpdate) {
      IsPointerEventActiveComponentState.getMutable(
        engine.RootEntity
      ).currentTimestamp = Math.max(command.timestamp, state.currentTimestamp)
      return true // up component is from an old click
    } else {
      return false
    }
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
