import { RPC } from '../rpc'

type TargetWindow = {
  onmessage: ((event: MessageEvent) => void) | null
  postMessage: (message: any, origin: string) => void
}

export class WindowTransport implements RPC.Transport {
  private ready = false
  private queue: any[] = []

  constructor(public target: TargetWindow) {
    this.target.onmessage = (event) => {
      if (!this.ready && event.data && (event.data.type === 'ping' || event.data.type === 'pong')) {
        // set as ready and flush the queue
        this.ready = true
        while (this.queue.length > 0) {
          const message = this.queue.shift()
          this.send(message)
        }
        // only send pong if the message received was a ping
        if (event.data.type === 'ping') {
          this.target.postMessage({ type: 'pong' }, '*')
        }
      } else if (this.handler) {
        this.handler(event.data)
      }
    }
    this.target.postMessage({ type: 'ping' }, '*')
  }

  handler: RPC.Transport['handler']

  send(message: any) {
    if (!this.ready) {
      this.queue.push(message)
    } else {
      this.target.postMessage(message, '*')
    }
  }
}
