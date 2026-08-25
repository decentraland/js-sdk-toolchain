import type { MessageBus } from '../../packages/@dcl/sdk/src/message-bus'

type Deferred = {
  promise: Promise<unknown>
  resolve: (value: unknown) => void
  reject: (reason: Error) => void
}

describe('MessageBus', () => {
  describe('when a message is still being sent', () => {
    let MessageBusConstructor: typeof MessageBus
    let sendMock: jest.Mock
    let deferred: Deferred
    let messageBus: MessageBus

    beforeEach(() => {
      let resolvePromise: (value: unknown) => void = () => undefined
      let rejectPromise: (reason: Error) => void = () => undefined
      const promise = new Promise<unknown>((resolve, reject) => {
        resolvePromise = resolve
        rejectPromise = reject
      })
      deferred = { promise, resolve: resolvePromise, reject: rejectPromise }
      sendMock = jest.fn().mockReturnValueOnce(deferred.promise).mockResolvedValueOnce(undefined)
      jest.doMock('~system/CommunicationsController', () => ({ send: sendMock }), { virtual: true })
      jest.doMock('../../packages/@dcl/sdk/src/observables', () => ({
        onCommsMessage: { add: jest.fn(), notifyObservers: jest.fn() }
      }))
      jest.isolateModules(() => {
        MessageBusConstructor = require('../../packages/@dcl/sdk/src/message-bus').MessageBus
      })
      messageBus = new MessageBusConstructor()
    })

    afterEach(async () => {
      deferred.resolve(undefined)
      await deferred.promise
      await Promise.resolve()
      jest.resetModules()
      jest.restoreAllMocks()
    })

    it('should keep the next message queued', () => {
      messageBus.sendRaw('first')
      messageBus.sendRaw('second')

      expect(sendMock.mock.calls.map(([request]) => request.message)).toEqual(['first'])
    })
  })

  describe('when sending a message fails', () => {
    let MessageBusConstructor: typeof MessageBus
    let sendMock: jest.Mock
    let deferred: Deferred
    let messageBus: MessageBus

    beforeEach(() => {
      let resolvePromise: (value: unknown) => void = () => undefined
      let rejectPromise: (reason: Error) => void = () => undefined
      const promise = new Promise<unknown>((resolve, reject) => {
        resolvePromise = resolve
        rejectPromise = reject
      })
      deferred = { promise, resolve: resolvePromise, reject: rejectPromise }
      sendMock = jest.fn().mockReturnValueOnce(deferred.promise).mockResolvedValueOnce(undefined)
      jest.doMock('~system/CommunicationsController', () => ({ send: sendMock }), { virtual: true })
      jest.doMock('../../packages/@dcl/sdk/src/observables', () => ({
        onCommsMessage: { add: jest.fn(), notifyObservers: jest.fn() }
      }))
      jest.isolateModules(() => {
        MessageBusConstructor = require('../../packages/@dcl/sdk/src/message-bus').MessageBus
      })
      messageBus = new MessageBusConstructor()
      messageBus.sendRaw('first')
      messageBus.sendRaw('second')
    })

    afterEach(async () => {
      await Promise.resolve()
      jest.resetModules()
      jest.restoreAllMocks()
    })

    it('should continue flushing the remaining messages', async () => {
      deferred.reject(new Error('send failed'))
      await deferred.promise.catch(() => undefined)
      await Promise.resolve()

      expect(sendMock.mock.calls.map(([request]) => request.message)).toEqual(['first', 'second'])
    })
  })
})
