import expect from 'expect'

import { compareData } from './utils'
import { createSandbox } from './utils/sandbox'

describe('CRDT process message', () => {
  it('should return the data if its a new message', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key1 = 7,
      key2 = 11
    const messageA = clientA.createComponentDataEvent(
      key1,
      key2,
      Buffer.from('casla')
    )!

    clientB.processMessage(messageA)
    const value = clientB
      .getState()
      .components.get(messageA.componentId)!
      .get(messageA.entityId)!

    expect(compareData(value.data as Buffer, messageA.data)).toBe(true)
  })

  it('should return void if its an outdated message', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key1 = 7,
      key2 = 11

    clientA.createComponentDataEvent(key1, key2, Buffer.from('casla'))
    const { data } = clientA.createComponentDataEvent(
      key1,
      key2,
      Buffer.from('casla2')
    )!
    const messageB = clientB.createComponentDataEvent(
      key1,
      key2,
      Buffer.from('boedo')
    )!
    // LamportA: 2, data: casla2
    // LamportB: 1, data: boedo

    clientA.processMessage(messageB)
    const value = clientA
      .getState()
      .components.get(messageB.componentId)!
      .get(messageB.entityId)!

    await clientB.sendMessage(messageB)
    expect(value.data).toBe(data)
    expect(clientB.getElementSetState(key1, key2)?.data).toBe(data)
  })

  it('should return data if they have the same lamport number but bigger raw value', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key1 = 7,
      key2 = 11

    const messageA = clientA.createComponentDataEvent(
      key1,
      key2,
      Buffer.from('casla')
    )!
    const messageB = clientB.createComponentDataEvent(
      key1,
      key2,
      Buffer.from('boedo')
    )!
    // LamportA: 1, data: casla2
    // LamportB: 1, data: boedo
    // dataA > dataB

    clientB.processMessage(messageA)
    const valueB = clientB
      .getState()
      .components.get(messageA.componentId)!
      .get(messageA.entityId)!

    clientA.processMessage(messageB)
    const valueA = clientA
      .getState()
      .components.get(messageB.componentId)!
      .get(messageB.entityId)!

    expect(valueA.data).toBe(messageA.data)
    expect(compareData(valueB.data as Buffer, messageA.data)).toBe(true)
  })

  it('delete entity should converge to the same state independent of sorting', async () => {
    const [clientA, clientB, clientC] = createSandbox({
      clientLength: 3
    }).clients

    const componentId = 7,
      entityId = 11

    const message = clientA.createComponentDataEvent(
      componentId,
      entityId,
      Buffer.from('messi')
    )!

    const deleteMsg = clientA.createDeleteEntityEvent(entityId)

    // clientB: receive first the delete
    clientB.processMessage(deleteMsg)
    clientB.processMessage(message)

    // clientC: receive right ordering
    clientC.processMessage(message)
    clientC.processMessage(deleteMsg)

    const valueA = clientA
      .getState()
      .components.get(message.componentId)
      ?.get(message.entityId)
    const valueB = clientB
      .getState()
      .components.get(message.componentId)
      ?.get(message.entityId)
    const valueC = clientC
      .getState()
      .components.get(message.componentId)
      ?.get(message.entityId)

    expect(valueA).toBeUndefined()
    expect(valueB).toBeUndefined()
    expect(valueC).toBeUndefined()
  })
})
