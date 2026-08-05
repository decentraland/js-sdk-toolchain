/// <reference types="node" />

import { debounce } from '../../../packages/@dcl/sdk-commands/src/logic/debounce'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('logic/debounce', () => {
  it('collapses a burst of calls into a single trailing call', async () => {
    const fn = jest.fn()
    const debounced = debounce(fn, 5)

    debounced(1)
    debounced(2)
    await sleep(40)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith(2)
  })

  it('logs a rejected callback instead of leaving the rejection unhandled', async () => {
    const unhandled = jest.fn()
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    const boom = new Error('boom')
    process.on('unhandledRejection', unhandled)

    try {
      debounce(async () => {
        throw boom
      }, 5)()
      await sleep(40)

      expect(unhandled).not.toHaveBeenCalled()
      expect(consoleError).toHaveBeenCalledWith(boom)
    } finally {
      process.off('unhandledRejection', unhandled)
      consoleError.mockRestore()
    }
  })
})
