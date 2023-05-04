import { Transport } from '@dcl/ecs'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { IEngine, Engine } from '@dcl/ecs/dist/engine'

let called = false

export function withRenderer(cb: (engine: IEngine) => void) {
  if (called) throw new Error('Only call withRenderer once')
  called = true

  const engine = Engine()

  const outMessages: Uint8Array[] = []

  const rendererTransport: Transport = {
    async send(message) {
      outMessages.push(message)
    },
    filter() {
      return true
    }
  }

  engine.addTransport(rendererTransport)

  cb(engine)
  return async function (data: Uint8Array) {
    if (rendererTransport.onmessage) {
      rendererTransport.onmessage(data)

      await engine.update(0)

      if (outMessages.length > 1) {
        throw new Error('Problem with amount of outgoint messages')
      }

      if (outMessages.length === 1) {
        const r = outMessages.shift()
        return r
      }
    }

    return new Uint8Array()
  }
}
