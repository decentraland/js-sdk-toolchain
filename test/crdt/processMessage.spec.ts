import expect from 'expect'

import { compareData } from './utils'
import { createSandbox } from './utils/sandbox'

describe('CRDT process message', () => {
  it('should return the data if its a new message', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key1 = 7,
      key2 = 11
    const messageA = clientA.createComponentDataEvent(key1, key2, Buffer.from('casla'))
    const resultValue = clientB.processMessage(messageA)
    const value = clientB.getState().components.get(messageA.componentId)!.get(messageA.entityId)!

    expect(compareData(value.data as Buffer, messageA.data)).toBe(true)
  })

  it('should return void if its an outdated message', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key1 = 7,
      key2 = 11

    clientA.createComponentDataEvent(key1, key2, Buffer.from('casla'))
    const { data } = clientA.createComponentDataEvent(key1, key2, Buffer.from('casla2'))
    const messageB = clientB.createComponentDataEvent(key1, key2, Buffer.from('boedo'))
    // LamportA: 2, data: casla2
    // LamportB: 1, data: boedo
    const resultValue = clientA.processMessage(messageB)
    const value = clientA.getState().components.get(messageB.componentId)!.get(messageB.entityId)!

    await clientB.sendMessage(messageB)
    expect(value.data).toBe(data)
    expect(clientB.getElementSetState(key1, key2)?.data).toBe(data)
  })

  it('should return data if they have the same lamport number but bigger raw value', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key1 = 7,
      key2 = 11

    const messageA = clientA.createComponentDataEvent(key1, key2, Buffer.from('casla'))
    const messageB = clientB.createComponentDataEvent(key1, key2, Buffer.from('boedo'))
    // LamportA: 1, data: casla2
    // LamportB: 1, data: boedo
    // dataA > dataB
    const resultValueB = clientB.processMessage(messageA)
    const valueB = clientB.getState().components.get(messageA.componentId)!.get(messageA.entityId)!

    const resultValueA = clientA.processMessage(messageB)
    const valueA = clientA.getState().components.get(messageB.componentId)!.get(messageB.entityId)!

    expect(valueA.data).toBe(messageA.data)
    expect(compareData(valueB.data as Buffer, messageA.data)).toBe(true)
  })
})
