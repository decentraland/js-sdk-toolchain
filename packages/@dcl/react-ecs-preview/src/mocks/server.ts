// Mock of @dcl/sdk/server. Server-side only; the UI shouldn't hit this, but it's
// stubbed so anything in the import graph that references Storage won't crash.
export const Storage = {
  async get() {
    return null
  },
  async set() {},
  async delete() {}
}
