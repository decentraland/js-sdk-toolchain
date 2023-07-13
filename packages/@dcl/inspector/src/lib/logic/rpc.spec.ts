import { RPC } from './rpc'

namespace Test {
  export enum EventType {
    FOO = 'foo'
  }

  export type EventData = {
    [EventType.FOO]: { bar: string }
  }

  export enum Method {
    ADD = 'add'
  }

  export type Params = {
    [Method.ADD]: { a: number; b: number }
  }

  export type Result = {
    [Method.ADD]: { c: number }
  }

  export class Transport extends RPC.Transport {
    other: RPC.Transport | null = null
    send(message: RPC.Message) {
      if (this.other) {
        this.other.emit('message', message)
      }
    }
  }
}

class Client extends RPC<Test.EventType, Test.EventData, Test.Method, Test.Params, Test.Result> {
  constructor(transport: RPC.Transport) {
    super('test', transport)
  }
  async add(a: number, b: number) {
    const { c } = await this.request('add', { a, b })
    return c
  }
}

class Server extends RPC<Test.EventType, Test.EventData, Test.Method, Test.Params, Test.Result> {
  constructor(transport: RPC.Transport) {
    super('test', transport)
    this.handle('add', async ({ a, b }) => ({ c: a + b }))
  }
}

const transportA = new Test.Transport()
const transportB = new Test.Transport()

transportA.other = transportB
transportB.other = transportA

const client = new Client(transportA)
const server = new Server(transportB)

describe('RPC', () => {
  describe('When requesting a method on the client', () => {
    it('should be handled by the server', async () => {
      await expect(client.add(1, 2)).resolves.toBe(3)
    })
  })
  describe('When emitting an event on the server', () => {
    it('should be handled by the client', () => {
      const handler = jest.fn()
      client.on('foo', handler)
      server.emit('foo', { bar: 'baz' })
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ bar: 'baz' })
    })
  })
  describe('When emitting an event on the client', () => {
    it('should be handled by the server', () => {
      const handler = jest.fn()
      server.on('foo', handler)
      client.emit('foo', { bar: 'baz' })
      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ bar: 'baz' })
    })
  })
})
