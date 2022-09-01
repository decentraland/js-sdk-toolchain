import {Entity} from "./entity";
import {engine} from "../runtime/initialization";
import {PBPointerEventsResult_PointerCommand} from "../components/generated/pb/PointerEventsResult.gen";
import {PointerEventType} from "../components/generated/pb/PointerEvents.gen";
import {ActionButton} from "../components/generated/pb/common/ActionButton.gen";

export function wasEntityClicked(entity: Entity, actionButton: ActionButton): boolean {
  const commands =  engine.baseComponents.PointerEventsResult.get(entity).commands
  const down = findLastAction(commands, PointerEventType.DOWN,actionButton)
  const up = findLastAction(commands, PointerEventType.UP,actionButton)

  if (!down) return false
  if (!up) return false
  if (down.timestamp < up.timestamp) return true // clicked
  return false
}

export function isActivePointerDown(entity: Entity, actionButton: ActionButton): boolean {
  const commands =  engine.baseComponents.PointerEventsResult.get(entity).commands
  const down = findLastAction(commands, PointerEventType.DOWN,actionButton)
  const up = findLastAction(commands, PointerEventType.UP,actionButton)

  if (!down) return false
  if (!up) return true // currently pressed
  if (down.timestamp > up.timestamp) return true // up component is from an old click
  else return false
}

function findLastAction(commands: readonly PBPointerEventsResult_PointerCommand[], pointerEventType: PointerEventType, actionButton: ActionButton): PBPointerEventsResult_PointerCommand | undefined {
  let commandToReturn: PBPointerEventsResult_PointerCommand | undefined
  commands.forEach((command) =>{
    if(command.button === actionButton && command.state === pointerEventType){
      if(!commandToReturn || command.timestamp >= commandToReturn.timestamp)
        commandToReturn = command
    }
  })
  return commandToReturn !== undefined ? commandToReturn : undefined;
}
