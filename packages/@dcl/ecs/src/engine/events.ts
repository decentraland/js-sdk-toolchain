import { Entity } from "./entity";
import { engine } from "../runtime/initialization";
import {
  PBPointerEventsResult_PointerCommand
} from "../components/generated/pb/PointerEventsResult.gen";

export function* getPointerEvents(): Iterable<[Entity, PBPointerEventsResult_PointerCommand] > {
  const rootEntity = (0 as Entity)
  const value = engine.baseComponents.PointerEventsResult.getOrNull(rootEntity)
  if(value != null){
    for (const command of value.commands) {
      yield [(command.hit!.entityId || 0 ) as Entity , command]
    }
  }
}
