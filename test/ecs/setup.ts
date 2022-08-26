import { toBeDeepCloseTo, toMatchCloseTo } from 'jest-matcher-deep-close-to'
expect.extend({ toBeDeepCloseTo, toMatchCloseTo })

const _WebSocket = globalThis.WebSocket

export class WebSocket<T = unknown> {
  constructor(public url: string) {}
  public onmessage(_message: T): void {}
  public send(_message: T): void {}
}

beforeAll(() => {
  globalThis.WebSocket = WebSocket as any
})

afterAll(() => {
  globalThis.WebSocket = _WebSocket
})
