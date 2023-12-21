import { AsyncQueue } from '@well-known-components/pushable-channel'

import { store } from '../../redux/store'
import { updateSession } from '../../redux/app'
import { MessageType, Stream, decode } from '../data-layer/host/ws'
import { DataLayerRpcClient } from '../data-layer/types'

export async function initCollaborativeEditor(dataLayerWsStream: DataLayerRpcClient['wsStream']) {
  const queue = new AsyncQueue<Stream>((_, _action) => {})

  for await (const { type, data } of dataLayerWsStream(queue)) {
    processMessage(type, data)
  }
}

function is<T>(typeA: MessageType, typeB: MessageType, _: T): _ is T {
  return typeA === typeB
}

interface InitMessage {
  participants: string[]
}

interface ParticipantJoined {
  participant: string
}

interface ParticipantLeft {
  participant: string
}

function processMessage(msgType: MessageType, data: Uint8Array): void {
  const message = decode(data)
  const { session } = store.getState().app

  if (is<InitMessage>(msgType, MessageType.Init, message)) {
    store.dispatch(updateSession({ participants: message.participants.map(($) => ({ address: $ })) }))
  }

  if (is<ParticipantJoined>(msgType, MessageType.ParticipantJoined, message)) {
    const participants = session.participants.concat({ address: message.participant })
    store.dispatch(updateSession({ participants }))
  }

  if (is<ParticipantLeft>(msgType, MessageType.ParticipantLeft, message)) {
    const participants = session.participants.filter(($) => $.address !== message.participant)
    store.dispatch(updateSession({ participants }))
  }

  if (is(msgType, MessageType.ParticipantSelectedEntity, message)) {
  }

  if (is(msgType, MessageType.ParticipantUnselectedEntity, message)) {
  }
}

// type ProcessedMessages<T = Record<string, unknown>> = { type: MessageType; message: T }
// type SelectionComponentMessage = ProcessedMessages<{ entityId: Entity }>

// function processCrdtMessage(message: DeserializedCrdtMessage): ProcessedMessages[] {
//   const messages: ProcessedMessages[] = [...selectionComponentMessages(message)]

//   return messages
// }

// function selectionComponentMessages(message: DeserializedCrdtMessage): SelectionComponentMessage[] {
//   if (getPutComponentFromMessage<EditorComponentsTypes['Selection']>(message, EditorComponentNames.Selection)) {
//     return [{ type: MessageType.ParticipantSelectedEntity, message: { entityId: message.entityId } }]
//   }

//   if (getDeleteComponentFromMessage(message, EditorComponentNames.Selection)) {
//     return [{ type: MessageType.ParticipantUnselectedEntity, message: { entityId: message.entityId } }]
//   }

//   return []
// }
