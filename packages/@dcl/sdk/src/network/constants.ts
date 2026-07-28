// Leaf module: it must not import anything from `network/`. Holding these here is
// what keeps `message-bus-sync → state → server` acyclic.

export type IProfile = { networkId: number; userId: string }

/** peer we ask the initial CRDT state from */
export const AUTH_SERVER_PEER_ID = 'authoritative-server'

export const DEBUG_NETWORK_MESSAGES = () => (globalThis as any).DEBUG_NETWORK_MESSAGES ?? false

/** max payload livekit accepts, in KB */
export const LIVEKIT_MAX_SIZE = 12
