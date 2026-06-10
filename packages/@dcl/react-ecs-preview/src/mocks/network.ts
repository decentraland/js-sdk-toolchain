// Mock of @dcl/sdk/network for preview. No transport — sends are dropped and
// no messages ever arrive, so the UI renders its disconnected/empty state.
export const isServer = false

export function registerMessages(_messages: unknown) {
  return {
    send() {},
    onMessage() {},
    onReady() {}
  }
}
