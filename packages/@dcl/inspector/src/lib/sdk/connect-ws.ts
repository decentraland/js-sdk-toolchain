import { v4 as uuid } from 'uuid'
import { AsyncQueue } from '@well-known-components/pushable-channel'

import { store } from '../../redux/store'
import { updateSession } from '../../redux/app'
import { MessageType, WsMessage, decode } from '../data-layer/host/ws'
import { DataLayerRpcClient } from '../data-layer/types'
import { getRandomMnemonic } from '../../components/ImportAsset/utils'
import { Entity } from '@dcl/ecs'

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

interface ParticipantSelectedEntity {
  participant: string
  entityId: Entity
  color: string
}

interface ParticipantUnselectedEntity {
  participant: string
  entityId: Entity
  color: string
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

  if (is<ParticipantSelectedEntity>(msgType, MessageType.ParticipantSelectedEntity, message)) {
    const participants = session.participants.map(($) => $.address !== message.participant ? $ : ({
      ...$,
      selectedEntity: message.entityId,
      color: stringToHex($.address)
    }))
    store.dispatch(updateSession({ participants }))
  }

  if (is<ParticipantUnselectedEntity>(msgType, MessageType.ParticipantUnselectedEntity, message)) {
    const participants = session.participants.map(($) => $.address !== message.participant ? $ : ({
      ...$,
      selectedEntity: undefined,
      color: undefined
    }))
    store.dispatch(updateSession({ participants }))
  }
}

// random stuff just for demo...
function stringToHex(str: string) {
  let hex = ''
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i)
    const hexValue = charCode.toString(16)

    hex += hexValue.padStart(2, '0')
  }
  return `#${hex.padStart(6, '0').split('').reverse().join('').slice(0, 6)}`
}
