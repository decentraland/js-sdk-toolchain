import mitt from 'mitt'
import { RPC } from '../rpc'
import { MessageTransport } from './message'

const events = mitt()
const send = (message: any) => events.emit('message', { data: message })

const source = {
  addEventListener: jest.fn().mockImplementation((type, hanlder) => events.on(type, hanlder)),
  removeEventListener: jest.fn()
}

const target = {
  postMessage: jest.fn()
}

const message: RPC.Message = { id: 'test', type: 'foo', payload: { bar: 'baz' } }

describe('MessageTransport', () => {
  let transport: MessageTransport

  beforeEach(() => {
    events.off('*')
    transport = new MessageTransport(source, target)
  })

  afterEach(() => {
    source.addEventListener.mockClear()
    source.removeEventListener.mockClear()
    target.postMessage.mockClear()
  })

  describe('When creating a MessageTransport', () => {
    it('should send a ping message to the target', () => {
      expect(target.postMessage).toHaveBeenCalledWith({ type: 'ping' }, '*')
    })
  })

  describe('When the transport is not ready', () => {
    it('the messages sent through it should be queued', () => {
      transport.send(message)
      expect(target.postMessage).not.toHaveBeenCalledWith(message, '*')
    })
    describe('and a ping message arrives', () => {
      it('should flush queued messages and send a pong message', () => {
        transport.send(message)
        send({ type: 'ping' })
        expect(target.postMessage).toHaveBeenCalledWith({ type: 'pong' }, '*')
        expect(target.postMessage).toHaveBeenCalledWith(message, '*')
      })
    })
    describe('and a pong message arrives', () => {
      it('should flush queued messages', () => {
        transport.send(message)
        send({ type: 'pong' })
        expect(target.postMessage).toHaveBeenCalledWith(message, '*')
      })
    })
  })

  describe('When the transport is ready', () => {
    beforeEach(() => {
      send({ type: 'pong' })
    })
    it('should send post messages to the target', () => {
      transport.send(message)
      expect(target.postMessage).toHaveBeenCalledWith(message, '*')
    })
    it('handle messages from the source and emit them', () => {
      const handler = jest.fn()
      transport.addEventListener('message', handler)
      send(message)
      expect(handler).toHaveBeenCalledWith(message)
    })
  })

  describe('When disposing the transport', () => {
    it('should remove the listener from the source', () => {
      transport.dispose()
      expect(source.removeEventListener).toHaveBeenCalledTimes(1)
    })
  })
})
