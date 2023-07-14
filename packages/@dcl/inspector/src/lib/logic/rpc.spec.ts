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
    [Method.ADD]: number
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
    return this.request('add', { a, b })
  }

  // this client method exists just to test an unimplemented method error on the server side
  async unimplemented() {
    return this.request('unimplemented' as never, {} as never)
  }
}

class Server extends RPC<Test.EventType, Test.EventData, Test.Method, Test.Params, Test.Result> {
  constructor(transport: RPC.Transport) {
    super('test', transport)
    this.handle('add', async ({ a, b }) => {
      if (isNaN(a) || isNaN(b)) {
        throw new Error('baNaNa 🍌')
      }
      return a + b
    })
  }
}

const transportA = new Test.Transport()
const transportB = new Test.Transport()

transportA.other = transportB
transportB.other = transportA

const client = new Client(transportA)
const server = new Server(transportB)

describe('RPC', () => {
  describe('When requesting a method to the client', () => {
    describe('and the server response is successful', () => {
      it("the client request should resolve to the server's response", async () => {
        await expect(client.add(1, 2)).resolves.toBe(3)
      })
    })
    describe('and the server response is NOT successful', () => {
      it("the client request should reject with the server's error message", async () => {
        await expect(client.add(1, NaN)).rejects.toThrow(/NaN/)
      })
    })
    describe('and the server has not implemented the method', () => {
      it('the client request should reject with an unimplemented method error', async () => {
        await expect(client.unimplemented()).rejects.toThrow(/not implemented/)
      })
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
    describe('and the handler has been unbound', () => {
      it('should not be called', () => {
        const handler = jest.fn()
        client.on('foo', handler)
        client.off('foo', handler)
        server.emit('foo', { bar: 'baz' })
        expect(handler).not.toHaveBeenCalled()
      })
    })
    describe('and the rpc has been disposed', () => {
      it('should not handle the event', () => {
        const handler = jest.fn()
        client.on('foo', handler)
        client.dispose()
        server.emit('foo', { bar: 'baz' })
        expect(handler).not.toHaveBeenCalled()
      })
    })
  })
})
