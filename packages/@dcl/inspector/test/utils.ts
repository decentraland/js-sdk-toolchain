const xhrMock = jest.fn().mockImplementation(() => ({
  open: jest.fn(),
  send: jest.fn(),
  setRequestHeader: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  abort: jest.fn()
}))

export function mockXMLHttpRequest() {
  const global = globalThis as any
  if (global.XMLHttpRequest !== xhrMock) {
    const prev = global.XMLHttpRequest
    global.XMLHttpRequest = xhrMock
    return () => {
      global.XMLHttpRequest = prev
    }
  }
  return () => {}
}
