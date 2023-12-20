import { IEngine } from "@dcl/ecs"
import { DataLayerRpcClient } from "../data-layer/types"
import { AsyncQueue } from "@well-known-components/pushable-channel"
import { CrdtStreamMessage } from "../data-layer/remote-data-layer"
import { serializeCrdtMessages } from "./crdt-logger"
import { consumeAllMessagesInto } from "../logic/consume-stream"
import { store } from "../../redux/store"
import { updateSession } from "../../redux/app"

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

export function addWs(
  url: string,
  engine: IEngine,
  queue: AsyncQueue<CrdtStreamMessage>,
  dataLayerStream: DataLayerRpcClient['crdtStream']
) {
  const ws = new WebSocket(url)
  ws.binaryType = 'arraybuffer'
  const onMessageFns: OnMessageFunction[] = []

  function onMessage(fn: OnMessageFunction) {
    onMessageFns.push(fn)
  }

  function sendMessage(type: MessageType, payload: Uint8Array) {
    ws.send(craftMessage(type, payload))
  }

  function cb(message: Uint8Array) {
    if (!message.byteLength) return

    Array.from(serializeCrdtMessages('DataLayer>Network', message, engine)).forEach(($) => console.log($))
    sendMessage(MessageType.Crdt, message)
  }

  ws.onopen = () => {
    console.log('WS connected', url)
    consumeAllMessagesInto(dataLayerStream(queue), cb).catch((e) => {
      console.error('WS consumeAllMessagesInto failed: ', e)
      queue.close()
    })
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

  return { onMessage, sendMessage }
}

export function initCollaborativeEditor(engine: IEngine, dataLayerStream: DataLayerRpcClient['crdtStream']) {
  const url = `ws://localhost:3000/iws/mariano?address=0xC67c60cD6d82Fcb2fC6a9a58eA62F80443E3268${Math.ceil(Math.random() * 50)}`
  const queue = new AsyncQueue<CrdtStreamMessage>((_, _action) => {})
  const ws = addWs(url, engine, queue, dataLayerStream)

  ws.onMessage((msgType: MessageType, data: Uint8Array) => {
    if (msgType === MessageType.Crdt) {
      Array.from(serializeCrdtMessages('Network>DataLayer', data, engine)).forEach(($) => console.log($))
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
