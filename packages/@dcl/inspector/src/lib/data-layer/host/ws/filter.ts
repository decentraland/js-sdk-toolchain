import { CrdtMessage, IEngine } from "@dcl/ecs";

import { MessageType, WsMessage, encode } from ".";
import { getDeleteComponentFromMessage, getDeserializedCrdtMessage, getPutComponentFromMessage } from "../../../sdk/crdt-logger";
import { EditorComponentNames, EditorComponentsTypes } from "../../../sdk/components";

type FilterMessage = { filter: boolean; messages: WsMessage[] }

export function processCrdtMessage(address: string, crdtMessage: CrdtMessage, engine: IEngine): FilterMessage {
  const message = getDeserializedCrdtMessage(crdtMessage, engine)

  if (getPutComponentFromMessage<EditorComponentsTypes['Selection']>(message, EditorComponentNames.Selection)) {
    return {
      filter: false,
      messages: [{ type: MessageType.ParticipantSelectedEntity, data: encode({ address, entityId: message.entityId })  }]
    }
  }

  if (getDeleteComponentFromMessage(message, EditorComponentNames.Selection)) {
    return {
      filter: false,
      messages: [{ type: MessageType.ParticipantUnselectedEntity, data: encode({ address, entityId: message.entityId }) }]
    }
  }

  if (getPutComponentFromMessage<EditorComponentsTypes['Nodes']>(message, EditorComponentNames.Nodes)) {
    return { filter: false, messages: [] }
  }

  return { filter: true, messages: [] }
}
