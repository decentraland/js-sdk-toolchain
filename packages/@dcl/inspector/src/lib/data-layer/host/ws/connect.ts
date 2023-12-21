import { MessageType } from '.'

export type OnMessageFunction = (type: MessageType, data: Uint8Array) => void

function craftMessage(msgType: MessageType, payload: Uint8Array): Uint8Array {
  const msg = new Uint8Array(payload.byteLength + 1)
  msg.set([msgType])
  msg.set(payload, 1)
  return msg
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
