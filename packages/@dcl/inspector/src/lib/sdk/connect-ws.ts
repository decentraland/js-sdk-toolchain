import { v4 as uuid } from 'uuid'
import { AsyncQueue } from '@well-known-components/pushable-channel'

import { store } from '../../redux/store'
import { updateSession } from '../../redux/app'
import { MessageType, WsMessage, decode } from '../data-layer/host/ws'
import { DataLayerRpcClient } from '../data-layer/types'
import { getRandomMnemonic } from '../../components/ImportAsset/utils'

export async function initCollaborativeEditor(
  saveWsStreamConf: DataLayerRpcClient['saveWsStreamConf'],
  wsStream: DataLayerRpcClient['wsStream']
) {
  const url = 'localhost:3000/iws'
  const room = 'test-room' || uuid()
  const address = getRandomMnemonic()
  const queue = new AsyncQueue<WsMessage>((_, _action) => {})

  await saveWsStreamConf({ url, room, address })

  for await (const { type, data } of wsStream(queue)) {
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
