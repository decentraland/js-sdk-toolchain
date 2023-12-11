import { Observer } from './internal/Observable'
import { IEvents, onCommsMessage } from './observables'
import * as communicationsController from '~system/CommunicationsController'

/**
 * @alpha
 * @deprecated this will only exist for a few releases in ECS7
 */
export class MessageBus {
  private messageQueue: string[] = []
  private flushing = false

  constructor() {}

  on(message: string, callback: (value: any, sender: string) => void): Observer<IEvents['comms']> {
    return onCommsMessage.add((e) => {
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
    this.messageQueue.push(message)

    this.flush()
  }
  emit(message: string, payload: Record<any, any>) {
    const messageToSend = JSON.stringify({ message, payload })
    this.sendRaw(messageToSend)
    onCommsMessage.notifyObservers({ message: messageToSend, sender: 'self' })
  }

  private flush() {
    if (!this.messageQueue.length) return
    if (this.flushing) return

    const message = this.messageQueue.shift()!
    communicationsController.send({ message }).then(
      (_) => {
        this.flushing = false
        this.flush()
      },
      (_) => {
        this.flushing = false
      }
    )
  }
}
