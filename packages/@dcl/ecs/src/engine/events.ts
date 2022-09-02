import { Entity } from './entity'
import { engine } from '../runtime/initialization'
import { PBPointerEventsResult_PointerCommand } from '../components/generated/pb/PointerEventsResult.gen'
import { PointerEventType } from '../components/generated/pb/PointerEvents.gen'
import { ActionButton } from '../components/generated/pb/common/ActionButton.gen'

type EventEntityTypeKey = {
  entityId: number
  actionButton: ActionButton
  pointerEventType: PointerEventType
}

const entityClikedMap: Map<EventEntityTypeKey, number> = new Map<
  EventEntityTypeKey,
  number
>()

export function wasEntityClicked(
  entity: Entity,
  actionButton: ActionButton
): boolean {
  const commands =
    engine.baseComponents.PointerEventsResult.get((0 as Entity)).commands
  // We search the last DOWN command sorted by timestamp
  const down = findLastAction(commands, PointerEventType.DOWN, actionButton)
  // We search the last UP command sorted by timestamp
  const up = findLastAction(commands, PointerEventType.UP, actionButton)

  if (!down) return false
  if (!up) return false

  const entityClickedLastCheckTimestamp = getLastTimestamp(
    entityClikedMap,
    entity,
    actionButton,
    PointerEventType.UP
  )
  // If the DOWN command has happen before the UP commands, it means that that a clicked has happen
  if (
    down.timestamp < up.timestamp &&
    up.timestamp > entityClickedLastCheckTimestamp
  ) {
    setLastTimestamp(
      entityClikedMap,
      entity,
      actionButton,
      PointerEventType.UP,
      up.timestamp
    )
    return true // clicked
  }
  return false
}

const entityPointerActiveMap: Map<EventEntityTypeKey, number> = new Map<
  EventEntityTypeKey,
  number
>()
export function isPointerEventActive(
  entity: Entity,
  actionButton: ActionButton,
  pointerEventType: PointerEventType
): boolean {
  const commands =
    engine.baseComponents.PointerEventsResult.get((0 as Entity)).commands
  // We search the last pointer Event command sorted by timestamp
  const command = findLastAction(commands, pointerEventType, actionButton)

  if (!command) return false

  const entityClickedLastCheckTimestamp = getLastTimestamp(
    entityPointerActiveMap,
    entity,
    actionButton,
    PointerEventType.UP
  )

  if (command.timestamp > entityClickedLastCheckTimestamp) {
    setLastTimestamp(
      entityPointerActiveMap,
      entity,
      actionButton,
      PointerEventType.UP,
      command.timestamp
    )
    return true // up component is from an old click
  } else {
    return false
  }
}

function setLastTimestamp(
  map: Map<EventEntityTypeKey, number>,
  entityId: number,
  actionButton: ActionButton,
  pointerEventType: PointerEventType,
  timestamp: number
) {
  const eventKey: EventEntityTypeKey = {
    entityId: entityId,
    actionButton: actionButton,
    pointerEventType: pointerEventType
  }
  map.set(eventKey, timestamp)
}

function getLastTimestamp(
  map: Map<EventEntityTypeKey, number>,
  entityId: number,
  actionButton: ActionButton,
  pointerEventType: PointerEventType
) {
  const eventKey: EventEntityTypeKey = {
    entityId: entityId,
    actionButton: actionButton,
    pointerEventType: pointerEventType
  }
  const timestamp = map.get(eventKey)
  if (timestamp) return timestamp
  else return -1
}

function findLastAction(
  commands: readonly PBPointerEventsResult_PointerCommand[],
  pointerEventType: PointerEventType,
  actionButton: ActionButton
): PBPointerEventsResult_PointerCommand | undefined {
  let commandToReturn: PBPointerEventsResult_PointerCommand | undefined
  commands.forEach((command) => {
    if (command.button === actionButton && command.state === pointerEventType) {
      if (!commandToReturn || command.timestamp >= commandToReturn.timestamp)
        commandToReturn = command
    }
  })
  return commandToReturn !== undefined ? commandToReturn : undefined
}
