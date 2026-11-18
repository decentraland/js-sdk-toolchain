import { Atom } from '../atom'
import { CommsMessage, decodeString, encodeString, type BinaryMessageBus } from './binary-message-bus'
import { AUTH_SERVER_PEER_ID, IProfile } from './message-bus-sync'

type RelayFrame = { message: string; from?: string }

export type MessageBusRelay = {
  send(message: string): void
  onMessage(callback: (message: string, sender: string) => void): void
}

/**
 * Routes the legacy text MessageBus through the authoritative server: clients
 * send to the server, which rebroadcasts with the original sender attached.
 * @internal
 */
export function createMessageBusRelay(
  binaryMessageBus: ReturnType<typeof BinaryMessageBus>,
  isServerAtom: Atom<boolean>,
  isRoomReadyAtom: Atom<boolean>,
  myProfile: IProfile
): MessageBusRelay {
  const listeners: ((message: string, sender: string) => void)[] = []
  const queue: string[] = []

  function emitFrame(frame: RelayFrame) {
    binaryMessageBus.emit(CommsMessage.MESSAGE_BUS, encodeString(JSON.stringify(frame)))
  }

  isRoomReadyAtom.observable.add((isReady) => {
    if (!isReady) return
    for (const message of queue.splice(0)) emitFrame({ message })
  })

  binaryMessageBus.on(CommsMessage.MESSAGE_BUS, async (data, sender) => {
    let frame: RelayFrame
    try {
      frame = JSON.parse(decodeString(data))
    } catch {
      return
    }
    if (typeof frame?.message !== 'string') return

    // The role resolves asynchronously; deciding before it does drops client frames on the server.
    if (await isServerAtom.deref()) {
      if (sender === AUTH_SERVER_PEER_ID) return
      emitFrame({ message: frame.message, from: sender })
      for (const listener of listeners) listener(frame.message, sender)
      return
    }

    if (sender !== AUTH_SERVER_PEER_ID) return
    const from = frame.from ?? AUTH_SERVER_PEER_ID
    // The server broadcasts to everyone, including the original sender, who already echoed it locally.
    if (myProfile.userId && from.toLowerCase() === myProfile.userId.toLowerCase()) return
    for (const listener of listeners) listener(frame.message, from)
  })

  return {
    send(message) {
      if (isRoomReadyAtom.getOrNull()) emitFrame({ message })
      else queue.push(message)
    },
    onMessage(callback) {
      listeners.push(callback)
    }
  }
}
