const mockCheckAwards = jest.fn()

// No mock file exists for ~system/Badges under test/__mocks__, hence virtual
jest.mock('~system/Badges', () => ({ checkAwards: (body: unknown) => mockCheckAwards(body) }), { virtual: true })

import { Schemas } from '@dcl/ecs'
import { CommsMessage } from '../../../packages/@dcl/sdk/src/network/binary-message-bus'
import { decodeEvent } from '../../../packages/@dcl/sdk/src/network/events/protocol'
import { installInternalMessages, sendBadgeAwarded } from '../../../packages/@dcl/sdk/src/network/internal-messages'

const AUTH_SERVER = 'authoritative-server'

function fakeBus() {
  const handlers = new Map<CommsMessage, (data: Uint8Array, sender: string) => void>()
  const emitted: { message: CommsMessage; data: Uint8Array; to?: string[] }[] = []
  return {
    handlers,
    emitted,
    on: (message: CommsMessage, callback: (data: Uint8Array, sender: string) => void) => handlers.set(message, callback),
    emit: (message: CommsMessage, data: Uint8Array, to?: string[]) => emitted.push({ message, data, to })
  }
}

const atom = (value: boolean) => ({ getOrNull: () => value, deref: () => Promise.resolve(value) }) as any

describe('internal messages', () => {
  beforeEach(() => mockCheckAwards.mockReset())

  it('sends the award hint on SDK_EVENT, never on CUSTOM_EVENT, to the lowercased player', async () => {
    const bus = fakeBus()
    installInternalMessages(bus, atom(true), AUTH_SERVER)

    await sendBadgeAwarded('0xAbCdEf0000000000000000000000000000000001', 'bdg_0123456789abcdef')

    expect(bus.emitted).toHaveLength(1)
    expect(bus.emitted[0].message).toBe(CommsMessage.SDK_EVENT)
    expect(bus.emitted[0].to).toEqual(['0xabcdef0000000000000000000000000000000001'])
    expect(bus.handlers.has(CommsMessage.CUSTOM_EVENT)).toBe(false)
  })

  it('a client acts on a hint from the authoritative server, and on nothing else', async () => {
    const bus = fakeBus()
    installInternalMessages(bus, atom(false), AUTH_SERVER)
    await sendBadgeAwarded('0x' + '1'.repeat(40), 'bdg_0123456789abcdef')
    const hint = bus.emitted[0].data
    const handler = bus.handlers.get(CommsMessage.SDK_EVENT)!

    handler(hint, '0x' + '2'.repeat(40)) // another peer
    expect(mockCheckAwards).not.toHaveBeenCalled()

    handler(new Uint8Array([1, 2, 3]), AUTH_SERVER) // garbage from the server
    expect(mockCheckAwards).not.toHaveBeenCalled()

    handler(hint, AUTH_SERVER)
    await Promise.resolve()
    expect(mockCheckAwards).toHaveBeenCalledWith({})
  })

  it('the server ignores hints', async () => {
    const bus = fakeBus()
    installInternalMessages(bus, atom(true), AUTH_SERVER)
    await sendBadgeAwarded('0x' + '1'.repeat(40), 'bdg_0123456789abcdef')

    bus.handlers.get(CommsMessage.SDK_EVENT)!(bus.emitted[0].data, AUTH_SERVER)
    await Promise.resolve()
    expect(mockCheckAwards).not.toHaveBeenCalled()
  })

  it('the hint decodes with the badge id, so the payload is a stable contract', async () => {
    const bus = fakeBus()
    installInternalMessages(bus, atom(true), AUTH_SERVER)
    await sendBadgeAwarded('0x' + '1'.repeat(40), 'bdg_0123456789abcdef')

    const registry = { badgeAwarded: Schemas.Map({ badgeId: Schemas.String }) }
    const decoded = decodeEvent(bus.emitted[0].data, registry as any)
    expect(decoded.eventType).toBe('badgeAwarded')
    expect(decoded.payload).toEqual({ badgeId: 'bdg_0123456789abcdef' })
  })
})
