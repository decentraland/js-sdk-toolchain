import type { MessageBus } from '../../packages/@dcl/sdk/src/message-bus'

describe('MessageBus', () => {
  let MessageBusConstructor: typeof MessageBus
  let relay: { send: jest.Mock; onMessage: jest.Mock }
  let deliverFromRelay: (message: string, sender: string) => void

  beforeEach(() => {
    relay = {
      send: jest.fn(),
      onMessage: jest.fn((cb) => {
        deliverFromRelay = cb
      })
    }
    jest.doMock('../../packages/@dcl/sdk/src/network', () => ({ messageBusRelay: relay }))
    jest.isolateModules(() => {
      MessageBusConstructor = require('../../packages/@dcl/sdk/src/message-bus').MessageBus
    })
  })

  afterEach(() => {
    jest.resetModules()
  })

  describe('when a message is emitted', () => {
    it('should send it through the server relay and deliver it locally as self', () => {
      const bus = new MessageBusConstructor()
      const callback = jest.fn()
      bus.on('greet', callback)

      bus.emit('greet', { hello: 'world' })

      expect(relay.send).toHaveBeenCalledWith(JSON.stringify({ message: 'greet', payload: { hello: 'world' } }))
      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ hello: 'world' }, 'self')
    })
  })

  describe('when the relay delivers a message from another participant', () => {
    it('should call only the listeners of that message with the sender', () => {
      const bus = new MessageBusConstructor()
      const greet = jest.fn()
      const other = jest.fn()
      bus.on('greet', greet)
      bus.on('other', other)

      deliverFromRelay(JSON.stringify({ message: 'greet', payload: { n: 1 } }), '0xsender')

      expect(greet).toHaveBeenCalledWith({ n: 1 }, '0xsender')
      expect(other).not.toHaveBeenCalled()
    })
  })
})
