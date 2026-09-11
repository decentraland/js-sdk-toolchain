import { Observable } from '../../packages/@dcl/sdk/src/internal/Observable'
import { getEthereumProvider } from '../../packages/@dcl/sdk/src/internal/provider'

describe('when a once-observer notifies the same observable from inside its callback', () => {
  let observable: Observable<number>
  let calls: number[]

  beforeEach(() => {
    observable = new Observable<number>()
    calls = []
    observable.addOnce((value) => {
      calls.push(value)
      if (value === 1) {
        observable.notifyObservers(2)
      }
    })
    observable.notifyObservers(1)
  })

  it('should run the callback once', () => {
    expect(calls).toEqual([1])
  })
})

describe('when a once-observer is notified twice in the ordinary way', () => {
  let observable: Observable<number>
  let calls: number[]

  beforeEach(() => {
    observable = new Observable<number>()
    calls = []
    observable.addOnce((value) => calls.push(value))
    observable.notifyObservers(1)
    observable.notifyObservers(2)
  })

  it('should run the callback for the first notification only', () => {
    expect(calls).toEqual([1])
  })
})

describe('when an ordinary observer is notified', () => {
  let observable: Observable<number>
  let calls: number[]

  beforeEach(() => {
    observable = new Observable<number>()
    calls = []
    observable.add((value) => calls.push(value))
    observable.notifyObservers(1)
    observable.notifyObservers(2)
  })

  it('should keep running for every notification', () => {
    expect(calls).toEqual([1, 2])
  })
})

describe('when a provider callback throws on success', () => {
  let calls: { error: Error | null; result?: unknown }[]
  let consoleError: jest.SpyInstance

  beforeEach(async () => {
    calls = []
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
    const { sendAsync } = getEthereumProvider(async () => ({ jsonAnyResponse: JSON.stringify({ ok: true }) }))

    await new Promise<void>((resolve) => {
      sendAsync({ id: 1, jsonrpc: '2.0', method: 'test', params: [] }, (error, result) => {
        calls.push({ error, result })
        setTimeout(resolve, 0)
        throw new Error('the scene handler threw')
      })
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should call it once', () => {
    expect(calls).toHaveLength(1)
  })

  it('should call it with the result rather than an error', () => {
    expect(calls[0].error).toBeNull()
  })

  it('should report the throw rather than lose it', () => {
    expect(consoleError).toHaveBeenCalledTimes(1)
  })
})

describe('when a provider request fails', () => {
  let calls: { error: Error | null; result?: unknown }[]

  beforeEach(async () => {
    calls = []
    const { sendAsync } = getEthereumProvider(async () => {
      throw new Error('the request failed')
    })

    await new Promise<void>((resolve) => {
      sendAsync({ id: 1, jsonrpc: '2.0', method: 'test', params: [] }, (error, result) => {
        calls.push({ error, result })
        resolve()
      })
    })
  })

  it('should report the failure to the callback once', () => {
    expect(calls).toHaveLength(1)
  })

  it('should pass the error', () => {
    expect(calls[0].error).toEqual(expect.objectContaining({ message: 'the request failed' }))
  })
})
