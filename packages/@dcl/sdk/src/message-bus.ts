import { Observable, Observer } from './internal/Observable'
import { IEvents } from './observables'
import { messageBusRelay } from './network'

// Not the global onCommsMessage: raw comms text skips the server, so its sender can't be trusted.
const onMessageBusMessage = new Observable<IEvents['comms']>()
messageBusRelay.onMessage((message, sender) => onMessageBusMessage.notifyObservers({ message, sender }))

/**
 * Messages are relayed by the authoritative multiplayer server, so a scene using
 * MessageBus needs one (`authoritativeMultiplayer` in scene.json).
 * @alpha
 * @deprecated this will only exist for a few releases in ECS7
 */
export class MessageBus {
  constructor() {}

  on(message: string, callback: (value: any, sender: string) => void): Observer<IEvents['comms']> {
    return onMessageBusMessage.add((e) => {
      try {
        const m = JSON.parse(e.message)

        if (m.message === message) {
          callback(m.payload, e.sender)
        }
      } catch (_) {}
    })!
  }

  // @internal
  sendRaw(message: string) {
    messageBusRelay.send(message)
  }
  emit(message: string, payload: Record<any, any>) {
    const messageToSend = JSON.stringify({ message, payload })
    this.sendRaw(messageToSend)
    onMessageBusMessage.notifyObservers({ message: messageToSend, sender: 'self' })
  }
}
