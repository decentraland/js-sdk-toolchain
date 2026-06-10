// Mock of @dcl/sdk/players for preview. Returns a fixed fake local player.
export function getPlayer() {
  return {
    userId: '0x0000000000000000000000000000000000000000',
    name: 'PreviewPlayer',
    isGuest: false,
    avatar: undefined
  }
}

export function getPlayersInScene() {
  return []
}

export function onEnterScene() {}
export function onLeaveScene() {}
