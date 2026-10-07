import {
  INTERNAL_EVENT_PREFIX,
  Room,
  isInternalEventType,
  registerMessages
} from '../../../packages/@dcl/sdk/src/network/events/implementation'

// Enough of an Atom for the Room constructor; clear/onMessage never touch it.
const fakeAtom = {
  deref: () => Promise.resolve(false),
  observable: { add: () => undefined, remove: () => undefined },
  getOrNull: () => false
} as any

describe('reserved __dcl: message names', () => {
  it('recognizes the prefix', () => {
    expect(isInternalEventType(`${INTERNAL_EVENT_PREFIX}badgeAwarded`)).toBe(true)
    expect(isInternalEventType('badgeAwarded')).toBe(false)
    expect(isInternalEventType(Symbol('x'))).toBe(false)
  })

  it('registerMessages refuses them before anything else', () => {
    expect(() => registerMessages({ [`${INTERNAL_EVENT_PREFIX}mine`]: {} } as any)).toThrow('reserved')
  })

  it('room.clear() keeps the SDK listeners, with or without an explicit name', () => {
    // The constructor subscribes to CUSTOM_EVENT on the bus; nothing is ever emitted here.
    const room = new Room({} as any, { on: () => undefined }, fakeAtom, fakeAtom)
    const internal = `${INTERNAL_EVENT_PREFIX}badgeAwarded`
    room.onMessage(internal as any, () => undefined)
    room.onMessage('ping' as any, () => undefined)

    room.clear(internal as any)
    expect(room.listenerCount(internal as any)).toBe(1)

    room.clear()
    expect(room.listenerCount(internal as any)).toBe(1)
    expect(room.listenerCount('ping' as any)).toBe(0)
  })
})
