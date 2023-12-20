import { Entity, IEngine } from "@dcl/ecs"
import { AsyncQueue } from "@well-known-components/pushable-channel"

import { store } from "../../redux/store"
import { updateSession } from "../../redux/app"
import { consumeAllMessagesInto } from "../logic/consume-stream"
import { DataLayerRpcClient } from "../data-layer/types"
import { CrdtStreamMessage } from "../data-layer/remote-data-layer"
import { DeserializedCrdtMessage, deserializeCrdtMessage, isDeleteComponentMessage, isPutComponentMessage, getPutComponentFromMessage, logCrdtMessages, getDeleteComponentFromMessage, readMessage2 } from "./crdt-logger"
import { EditorComponentNames, EditorComponentsTypes } from "./components"

export enum MessageType {
  Init = 1,
  ParticipantJoined = 2,
  ParticipantLeft = 3,
  ParticipantSelectedEntity = 4,
  ParticipantUnselectedEntity = 5,
  Crdt = 6,
  FS = 7
}

export type OnMessageFunction = (type: MessageType, data: Uint8Array) => void

const encoder = new TextEncoder()
const decoder = new TextDecoder()

function craftMessage(msgType: MessageType, payload: Uint8Array): Uint8Array {
  const msg = new Uint8Array(payload.byteLength + 1)
  msg.set([msgType])
  msg.set(payload, 1)
  return msg
}

function decode(data: Uint8Array) {
  return JSON.parse(decoder.decode(data))
}

function encode(data: Record<string, unknown>) {
  return encoder.encode(JSON.stringify(data))
}

export function addWs(url: string) {
  const ws = new WebSocket(url)
  ws.binaryType = 'arraybuffer'
  const onMessageFns: OnMessageFunction[] = []
  const onOpenFns: (() => void)[] = []

  function onOpen(fn: () => void) {
    onOpenFns.push(fn)
  }

  function onMessage(fn: OnMessageFunction) {
    onMessageFns.push(fn)
  }

  function sendMessage(type: MessageType, payload: Uint8Array) {
    ws.send(craftMessage(type, payload))
  }

  ws.onopen = () => {
    console.log('WS connected', url)
    onOpenFns.forEach(($) => $())
  }

  ws.onmessage = (event) => {
    if (event.data.byteLength) {
      let offset = 0
      const r = new Uint8Array(event.data)
      const view = new DataView(r.buffer)
      const msgType = view.getUint8(offset)
      offset += 1
      onMessageFns.forEach(($) => $(msgType, r.subarray(offset)))
    }
  }

  ws.onerror = (e) => {
    console.error('WS error: ', e)
  }
  ws.onclose = () => {
    console.log('WS closed')
  }

  return { onOpen, onMessage, sendMessage }
}

export function initCollaborativeEditor(engine: IEngine, dataLayerStreamGenerator: DataLayerRpcClient['crdtStream']) {
  const url = `ws://localhost:3000/iws/mariano?address=0xC67c60cD6d82Fcb2fC6a9a58eA62F80443E3268${Math.ceil(Math.random() * 50)}`
  const queue = new AsyncQueue<CrdtStreamMessage>((_, _action) => {})
  const ws = addWs(url)
  const dataLayerStream = dataLayerStreamGenerator(queue)

  ws.onOpen(() => {
    consumeAllMessagesInto(dataLayerStream, (message: Uint8Array) => {
      if (!message.byteLength) return

      const crdtMessages = deserializeCrdtMessage(message, engine)
      logCrdtMessages('DataLayer>Network', crdtMessages)

      // we always send Crdt messages through the wire...
      ws.sendMessage(MessageType.Crdt, message)

      for (const msg of crdtMessages) {
        processCrdtMessage(msg).forEach(({ type, message }) => {
          ws.sendMessage(type, encode(message))
        })
      }
    })
    .catch((e) => {
      console.error('WS consumeAllMessagesInto failed: ', e)
      queue.close()
    })
  })

  ws.onMessage((msgType: MessageType, data: Uint8Array) => {
    if (msgType === MessageType.Crdt) {
      logCrdtMessages('Network>DataLayer', deserializeCrdtMessage(data, engine))
      queue.enqueue({ data })
    } else {
      execSessionMessage(msgType, data)
    }
  })
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

function execSessionMessage(msgType: MessageType, data: Uint8Array): void {
  const message = decode(data)
  const { session } = store.getState().app

  if (is<InitMessage>(msgType, MessageType.Init, message)) {
    console.log('Session Message: Init', message)
    store.dispatch(updateSession({ participants: message.participants.map(($) => ({ address: $ })) }))
  }

  if (is<ParticipantJoined>(msgType, MessageType.ParticipantJoined, message)) {
    console.log('Session Message: ParticipantJoined', message)
    const participants = session.participants.concat({ address: message.participant })
    store.dispatch(updateSession({ participants }))
  }

  if (is<ParticipantLeft>(msgType, MessageType.ParticipantLeft, message)) {
    console.log('Session Message: ParticipantLeft', message)
    const participants = session.participants.filter(($) => $.address !== message.participant)
    store.dispatch(updateSession({ participants }))
  }

  if (is(msgType, MessageType.ParticipantSelectedEntity, message)) {
    console.log('Session Message: ParticipantSelectedEntity', message)
  }

  if (is(msgType, MessageType.ParticipantUnselectedEntity, message)) {
    console.log('Session Message: ParticipantUnselectedEntity', message)
  }
}

type ProcessedMessages<T = Record<string, unknown>> = { type: MessageType, message: T }
type SelectionComponentMessage = ProcessedMessages<{ entityId: Entity }>

function processCrdtMessage(message: DeserializedCrdtMessage): ProcessedMessages[] {
  const messages: ProcessedMessages[] = [
    ...selectionComponentMessages(message)
  ]

  return messages
}

function selectionComponentMessages(message: DeserializedCrdtMessage): SelectionComponentMessage[] {
  if (getPutComponentFromMessage<EditorComponentsTypes['Selection']>(message, EditorComponentNames.Selection)) {
    return [{ type: MessageType.ParticipantSelectedEntity, message: { entityId: message.entityId } }]
  }

  if (getDeleteComponentFromMessage(message, EditorComponentNames.Selection)) {
    return [{ type: MessageType.ParticipantUnselectedEntity, message: { entityId: message.entityId } }]
  }

  return []
}
