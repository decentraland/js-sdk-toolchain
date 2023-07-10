import { RPC } from '../rpc'

type Target = {
  postMessage: (message: any, origin: string) => void
  addEventListener(type: 'message', listener: (event: MessageEvent) => void): void
}

export class MessageTransport implements RPC.Transport {
  private ready = false
  private queue: any[] = []

  constructor(public target: Target, origin: string = '*') {
    self.addEventListener('message', (event) => {
      if (event.data) {
        // special messages to establish communication
        if (event.data.type === 'ping' || event.data.type === 'pong') {
          // if communication channel is not ready
          if (!this.ready) {
            // set as ready
            this.ready = true
            // only send pong if the message received was a ping
            if (event.data.type === 'ping') {
              this.target.postMessage({ type: 'pong' }, origin)
            }
            /// flush the queue
            while (this.queue.length > 0) {
              const message = this.queue.shift()
              this.send(message)
            }
          }
          // send all other events to the handler (if any)
        } else if (this.handler) {
          this.handler(event.data)
        }
      }
    })
    // send ping
    this.target.postMessage({ type: 'ping' }, origin)
  }

  handler: RPC.Transport['handler']

  send(message: any) {
    // if not ready enqueue message
    if (!this.ready) {
      this.queue.push(message)
    } else {
      // otherwise send it
      this.target.postMessage(message, origin)
    }
  }
}
