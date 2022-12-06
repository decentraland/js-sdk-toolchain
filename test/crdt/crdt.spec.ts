import expect from 'expect'

import { compareData, compareStatePayloads } from './utils'
import { createSandbox } from './utils/sandbox'

describe('CRDT protocol', () => {
  it('should return true if there is no state', () => {
    expect(compareStatePayloads([])).toBe(true)
  })
  ;[true, false].forEach((delay) => {
    const msg = delay ? '[Delay] ' : ''
    it(`${msg}should store the message A in all the clients`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 2, delay })
      const [clientA] = clients
      const key1 = 7,
        key2 = 11
      const messageA = clientA.createEvent(key1, key2, Buffer.from('casla'))
      await clientA.sendMessage(messageA)
      await compare()
      expect(clientA.getElementSetState(key1, key2)?.data).toBe(messageA.data)
    })

    it(`${msg}one message with more clients (N > 2)`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 20, delay })
      const [clientA] = clients
      const key1 = 7,
        key2 = 11
      const messageA = clientA.createEvent(key1, key2, Buffer.from('casla'))
      await clientA.sendMessage(messageA)
      await compare()
    })

    it(`${msg}should decline message A if both messages are sent at the same time and data B > data A`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 2, delay })
      const [clientA, clientB] = clients
      const key1 = 7,
        key2 = 11

      // Buffer('a') > Buffer('z')
      const messageA = clientA.createEvent(key1, key2, Buffer.from('a'))
      const messageB = clientB.createEvent(key1, key2, Buffer.from('z'))
      const promiseA = clientA.sendMessage(messageA)
      const promiseB = clientB.sendMessage(messageB)
      await Promise.all([promiseA, promiseB])
      await compare()
      expect(
        compareData(
          clientA.getState().get(key1)!.get(key2)!.data,
          messageB.data
        )
      ).toBe(true)
    })

    it(`${msg}B > A but with more clients (N > 2)`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 4, delay })
      const [clientA, clientB] = clients
      const key1 = 7,
        key2 = 11
      const messageA = clientA.createEvent(key1, key2, Buffer.from('a'))
      const messageB = clientB.createEvent(key1, key2, Buffer.from('b'))
      const promiseA = clientA.sendMessage(messageA)
      const promiseB = clientB.sendMessage(messageB)
      await Promise.all([promiseA, promiseB])
      await compare()
      expect(
        compareData(clientA.getElementSetState(key1, key2)?.data, messageB.data)
      ).toBe(true)
    })

    it(`${msg}should store both keys`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 2, delay })
      const [clientA, clientB] = clients
      const key1 = 7,
        key2 = 11

      const key1b = 13,
        key2b = 17

      const messageA = clientA.createEvent(key1, key2, Buffer.from('boedo'))
      const messageB = clientB.createEvent(key1b, key2b, Buffer.from('casla'))

      const p1 = clientA.sendMessage(messageA)
      const p2 = clientB.sendMessage(messageB)
      await Promise.all([p1, p2])

      const messageB2 = clientB.createEvent(key1b, key2b, Buffer.from('a'))
      const messageA2 = clientA.createEvent(key1b, key2b, Buffer.from('z'))
      const p3 = clientB.sendMessage(messageB2)
      const p4 = clientA.sendMessage(messageA2)
      await Promise.all([p3, p4])
      await compare()
      expect(clientA.getElementSetState(key1b, key2b)?.data).toBe(
        messageA2.data
      )
    })

    it(`${msg}should store both keys, even if we send the messages in diff order z > a`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 2, delay })
      const [clientA, clientB] = clients
      const key1 = 7,
        key2 = 11

      const key1b = 13,
        key2b = 17

      const messageA = clientA.createEvent(key1, key2, Buffer.from('boedo'))
      const messageB = clientB.createEvent(key1b, key2b, Buffer.from('casla'))
      const promises = [
        clientA.sendMessage(messageA),
        clientB.sendMessage(messageB)
      ]
      await Promise.all(promises)
      const messageB2 = clientB.createEvent(key1b, key2b, Buffer.from('z'))
      const messageA2 = clientA.createEvent(key1b, key2b, Buffer.from('a'))
      const p1 = clientA.sendMessage(messageA2)
      const p2 = clientB.sendMessage(messageB2)

      await Promise.all([p1, p2])
      await compare()
      expect(clientA.getElementSetState(key1b, key2b)?.data).toBe(
        messageB2.data
      )
    })

    it(`${msg}same as before but with more clients (N > 2)`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 3, delay })
      const [clientA, clientB] = clients
      const key1 = 7,
        key2 = 11

      const key1b = 13,
        key2b = 17

      const messageA = clientA.createEvent(key1, key2, Buffer.from('boedo'))
      const messageB = clientB.createEvent(key1b, key2b, Buffer.from('casla'))
      const promises = [
        clientA.sendMessage(messageA),
        clientB.sendMessage(messageB)
      ]
      await Promise.all(promises)
      const messageB2 = clientB.createEvent(key1b, key2b, Buffer.from('z'))
      const messageA2 = clientA.createEvent(key1b, key2b, Buffer.from('a'))
      const p1 = clientA.sendMessage(messageA2)
      const p2 = clientB.sendMessage(messageB2)
      await Promise.all([p1, p2])
      await compare()
      expect(clientA.getElementSetState(key1b, key2b)?.data).toBe(
        messageB2.data
      )
    })

    it(`${msg}A, B and C send at the same time for the same key. Bigger raw should win`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 3, delay })
      const [clientA, clientB, clientC] = clients
      const key1 = 7,
        key2 = 11

      // Buffer('a') > Buffer('z')
      const messageA = clientA.createEvent(key1, key2, Buffer.from('A'))
      const messageB = clientB.createEvent(key1, key2, Buffer.from('z'))
      const messageC = clientC.createEvent(key1, key2, Buffer.from('C'))
      const p1 = clientA.sendMessage(messageA)
      const p2 = clientB.sendMessage(messageB)
      const p3 = clientC.sendMessage(messageC)
      await Promise.all([p1, p2, p3])
      await compare()
      expect(
        compareData(
          clientA.getElementSetState(key1, key2)?.data,
          Buffer.from('z')
        )
      ).toBe(true)
    })

    it(`${msg}A sends message, B has higher timestamp.`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 3, delay })
      const [clientA, clientB] = clients
      const key1 = 7,
        key2 = 11

      // Buffer('a') > Buffer('z')
      const messageB1 = clientB.createEvent(key1, key2, Buffer.from('A'))
      const messageB2 = clientB.createEvent(key1, key2, Buffer.from('B'))
      const messageA = clientA.createEvent(key1, key2, Buffer.from('C'))
      const p2 = clientB.sendMessage(messageB1)
      const p3 = clientB.sendMessage(messageB2)
      await Promise.all([p2, p3])
      await clientA.sendMessage(messageA)
      await compare()
      expect(
        compareData(
          clientA.getElementSetState(key1, key2)?.data,
          Buffer.from('B')
        )
      ).toBe(true)
    })
  })
})
