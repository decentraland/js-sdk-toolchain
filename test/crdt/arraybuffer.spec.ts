import { compareData } from './utils'
import { createSandbox } from './utils/sandbox'

describe('CRDT Uint8Array', () => {
  const encode = new TextEncoder()
  it('should return the same data', async () => {
    const { clients, compare } = createSandbox<Uint8Array>({ clientLength: 2 })
    const [clientA, clientB] = clients
    const key1 = 7,
      key2 = 11

    const messageA = clientA.createComponentDataEvent(
      key1,
      key2,
      encode.encode('Hola')
    )!
    const messageB = clientB.createComponentDataEvent(
      key1,
      key2,
      encode.encode('Hola')
    )!
    await Promise.all([
      clientB.sendMessage(messageB),
      clientA.sendMessage(messageA)
    ])
    await compare()
    expect(compareData(messageA.data, messageA.data)).toBe(true)
  })

  it('should return the bigger raw data', async () => {
    const { clients, compare } = createSandbox<Uint8Array>({ clientLength: 2 })
    const [clientA, clientB] = clients
    const key1 = 7,
      key2 = 11

    const messageA = clientA.createComponentDataEvent(
      key1,
      key2,
      encode.encode('a')
    )!
    const messageB = clientB.createComponentDataEvent(
      key1,
      key2,
      encode.encode('b')
    )!
    // b > a
    await Promise.all([
      clientB.sendMessage(messageB),
      clientA.sendMessage(messageA)
    ])
    await compare()
    expect(
      compareData(
        clientA.getElementSetState(key1, key2)!.data,
        encode.encode('b')
      )
    ).toBe(true)
  })
  it('should return the bigger raw data. a.byteLength !== b.byteLength', async () => {
    const { clients, compare } = createSandbox<Uint8Array>({ clientLength: 2 })
    const [clientA, clientB] = clients
    const key1 = 7,
      key2 = 11

    const messageA = clientA.createComponentDataEvent(
      key1,
      key2,
      encode.encode('aa')
    )!
    const messageB = clientB.createComponentDataEvent(
      key1,
      key2,
      encode.encode('b')
    )!
    // b > a
    await Promise.all([
      clientB.sendMessage(messageB),
      clientA.sendMessage(messageA)
    ])
    await compare()
    expect(
      compareData(
        clientA.getElementSetState(key1, key2)!.data,
        encode.encode('b')
      )
    ).toBe(true)
  })
})
