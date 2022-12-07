## CRDT Protocol

Example
```ts
type Transport {
  send(message: Message): Promise<void>,
  on(evt: 'message' | 'error'): Promise<void>
}

const clientA = crdtProtocol<Buffer>(uuid())
const clientB = crdtProtocol<Buffer>(uuid())

transportB.on('message', (message) => {
  const msg = clientB.processMessage(message)
  if (msg !== message) {
    transportB.send(msg)
  } else {
    // we receive a new update. Update component.
  }
})

const message = clientA.createEvent('keyA', new TextEncoder().encode('DCL CRDT'))
await transportA.sendMessage(message)
```
