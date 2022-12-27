import expect from 'expect'

import { compareData } from './utils'
import { createSandbox } from './utils/sandbox'

import { LWWMessage } from './../../packages/@dcl/crdt/dist/types'

describe('CRDT process message', () => {
  it('should return the data if its a new message', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key1 = 7,
      key2 = 11
    const messageA = clientA.createEvent(key1, key2, Buffer.from('casla'))
    const value = clientB.processMessage(messageA)

    expect(compareData((value as LWWMessage<Uint8Array>).data as Buffer, (messageA as LWWMessage<Uint8Array>).data)).toBe(true)
  })

  it('should return void if its an outdated message', async () => {
    const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
    const key1 = 7,
      key2 = 11

    clientA.createEvent(key1, key2, Buffer.from('casla'))
    const { data } = clientA.createEvent(key1, key2, Buffer.from('casla2')) as LWWMessage<Uint8Array>

  const messageB = clientB.createEvent(key1, key2, Buffer.from('boedo'))
  // LamportA: 2, data: casla2
  // LamportB: 1, data: boedo
  const value = clientA.processMessage(messageB)
  await clientB.sendMessage(messageB)
  expect((value as LWWMessage<Uint8Array>).data).toBe(data)
  expect(clientB.getElementSetState(key1, key2)?.data).toBe(data)
})

it('should return data if they have the same lamport number but bigger raw value', async () => {
  const [clientA, clientB] = createSandbox({ clientLength: 2 }).clients
  const key1 = 7,
    key2 = 11

  const messageA = clientA.createEvent(key1, key2, Buffer.from('casla'))
  const messageB = clientB.createEvent(key1, key2, Buffer.from('boedo'))
  // LamportA: 1, data: casla2
  // LamportB: 1, data: boedo
  // dataA > dataB
  const valueB = clientB.processMessage(messageA)
  const valueA = clientA.processMessage(messageB)
  expect((valueA as LWWMessage<Uint8Array>).data).toBe((messageA as LWWMessage<Uint8Array>).data)
  expect(compareData((valueB as LWWMessage<Uint8Array>).data as Buffer, (messageA as LWWMessage<Uint8Array>).data)).toBe(true)
})
})
