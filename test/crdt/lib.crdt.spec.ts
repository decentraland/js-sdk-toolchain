import expect from 'expect'

import { compareData, compareStatePayloads } from './utils'
import { createSandbox } from './utils/sandbox'

import { ProcessMessageResultType } from './../../packages/@dcl/crdt/src/types'

describe('CRDT protocol', () => {
  it('should return true if there is no state', () => {
    expect(compareStatePayloads([])).toBe(true)
  })
  const delayEnable = [false, true]
  delayEnable.forEach((delay) => {
    const msg = delay ? '[Delay] ' : ''
    it(`${msg}should store the message A in all the clients`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 2, delay })
      const [clientA] = clients
      const key1 = 7,
        key2 = 11

      // try to process invalid message
      const invalidMessageReuslt = clientA.processMessage({} as any)
      expect(invalidMessageReuslt).toBe(ProcessMessageResultType.NoChanges)

      // try to add negative version
      expect(clientA.getState().deletedEntities.addTo(0, -2)).toBe(false)

      const messageA = clientA.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('casla')
      )!
      await clientA.sendMessage(messageA)
      await compare()

      expect(clientA.getElementSetState(key1, key2)?.data).toBe(messageA.data)
      expect(clientA.getElementSetState(key1, key2)?.data).toBe(messageA.data)
    })

    it(`${msg}one message with more clients (N > 2)`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 20, delay })
      const [clientA] = clients
      const key1 = 7,
        key2 = 11
      const messageA = clientA.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('casla')
      )!
      await clientA.sendMessage(messageA)
      await compare()
    })

    it(`${msg}should decline message A if both messages are sent at the same time and data B > data A`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 2, delay })
      const [clientA, clientB] = clients
      const key1 = 7,
        key2 = 11

      // Buffer('a') > Buffer('z')
      const messageA = clientA.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('a')
      )!
      const messageB = clientB.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('z')
      )!
      const promiseA = clientA.sendMessage(messageA)
      const promiseB = clientB.sendMessage(messageB)
      await Promise.all([promiseA, promiseB])
      await compare()
      expect(
        compareData(
          clientA.getState().components.get(key1)!.get(key2)!.data,
          messageB.data
        )
      ).toBe(true)
    })

    it(`${msg}B > A but with more clients (N > 2)`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 4, delay })
      const [clientA, clientB] = clients
      const key1 = 7,
        key2 = 11
      const messageA = clientA.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('a')
      )!
      const messageB = clientB.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('b')
      )!
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

      const messageA = clientA.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('boedo')
      )!
      const messageB = clientB.createComponentDataEvent(
        key1b,
        key2b,
        Buffer.from('casla')
      )!

      const p1 = clientA.sendMessage(messageA)
      const p2 = clientB.sendMessage(messageB)
      await Promise.all([p1, p2])

      const messageB2 = clientB.createComponentDataEvent(
        key1b,
        key2b,
        Buffer.from('a')
      )!
      const messageA2 = clientA.createComponentDataEvent(
        key1b,
        key2b,
        Buffer.from('z')
      )!
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

      const messageA = clientA.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('boedo')
      )!
      const messageB = clientB.createComponentDataEvent(
        key1b,
        key2b,
        Buffer.from('casla')
      )!
      const promises = [
        clientA.sendMessage(messageA),
        clientB.sendMessage(messageB)
      ]
      await Promise.all(promises)
      const messageB2 = clientB.createComponentDataEvent(
        key1b,
        key2b,
        Buffer.from('z')
      )!
      const messageA2 = clientA.createComponentDataEvent(
        key1b,
        key2b,
        Buffer.from('a')
      )!
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

      const messageA = clientA.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('boedo')
      )!
      const messageB = clientB.createComponentDataEvent(
        key1b,
        key2b,
        Buffer.from('casla')
      )!
      const promises = [
        clientA.sendMessage(messageA),
        clientB.sendMessage(messageB)
      ]
      await Promise.all(promises)
      const messageB2 = clientB.createComponentDataEvent(
        key1b,
        key2b,
        Buffer.from('z')
      )!
      const messageA2 = clientA.createComponentDataEvent(
        key1b,
        key2b,
        Buffer.from('a')
      )!
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
      const messageA = clientA.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('A')
      )!
      const messageB = clientB.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('z')
      )!
      const messageC = clientC.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('C')
      )!
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
      const messageB1 = clientB.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('A')
      )!
      const messageB2 = clientB.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('B')
      )!
      const messageA = clientA.createComponentDataEvent(
        key1,
        key2,
        Buffer.from('C')
      )!
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

    it(`${msg}continuos message after delete the entities.`, async () => {
      const { clients, compare } = createSandbox({ clientLength: 3, delay })
      const [clientA, clientB] = clients

      const toResolve: Promise<any>[] = []
      for (let i = 0; i < 15; i++) {
        const entityId = i % 3
        const componentId = 7 + i
        const msgA = clientA.createComponentDataEvent(
          componentId,
          entityId,
          Buffer.from('messi')
        )

        if (i > 5) {
          const msgB = clientB.createDeleteEntityEvent(entityId)
          toResolve.push(clientB.sendMessage(msgB))
        }

        if (msgA !== null) toResolve.push(clientA.sendMessage(msgA))
      }

      await Promise.all(toResolve)
      await compare()

      const deletedEntities = clientA
        .getState()
        .deletedEntities.get()
        .sort((a, b) => {
          if (a[0] === b[0]) {
            return a[1] - b[1]
          }
          return a[0] - b[0]
        })
      expect(deletedEntities.toString()).toStrictEqual(
        [
          [0, 0],
          [1, 0],
          [2, 0]
        ].toString()
      )
    })

    it(`${msg} null message should lose.`, async () => {
      const { clients } = createSandbox({ clientLength: 3, delay })
      const [clientA, clientB] = clients

      const msgA = clientA.createComponentDataEvent(1, 1, Buffer.from('messi'))
      const msgB = clientB.createComponentDataEvent(1, 1, null)

      await clientA.sendMessage(msgA!)
      await clientB.sendMessage(msgB!)

      expect(
        compareData(
          clientA.getState().components.get(1)!.get(1)!.data,
          Buffer.from('messi')
        )
      ).toBe(true)
      expect(
        compareData(
          clientB.getState().components.get(1)!.get(1)!.data,
          Buffer.from('messi')
        )
      ).toBe(true)
    })

    it(`${msg} greater number should win.`, async () => {
      const { clients } = createSandbox<number>({
        clientLength: 3,
        delay
      })
      const [clientA, clientB] = clients

      const msgA = clientA.createComponentDataEvent(1, 1, 47)
      const msgB = clientB.createComponentDataEvent(1, 1, 59)

      await clientA.sendMessage(msgA!)
      await clientB.sendMessage(msgB!)

      expect(
        compareData(clientA.getState().components.get(1)!.get(1)!.data, 59)
      ).toBe(true)
      expect(
        compareData(clientB.getState().components.get(1)!.get(1)!.data, 59)
      ).toBe(true)

      const msgA2 = clientA.createComponentDataEvent(1, 1, 40)
      const msgB2 = clientB.createComponentDataEvent(1, 1, 40)

      await clientA.sendMessage(msgA2!)
      await clientB.sendMessage(msgB2!)

      expect(
        compareData(clientA.getState().components.get(1)!.get(1)!.data, 40)
      ).toBe(true)
      expect(
        compareData(clientB.getState().components.get(1)!.get(1)!.data, 40)
      ).toBe(true)
    })
  })
})
