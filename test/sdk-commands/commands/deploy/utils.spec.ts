import {
  createFetchComponent,
  deployLinkerUri,
  isEntityPublished,
  resolveDeployToken
} from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/utils'

type FetchInit = RequestInit & { timeout?: number; abortController?: AbortController }

function pendingUntilAborted(_url: unknown, init?: RequestInit): Promise<Response> {
  const signal = init!.signal!
  if (signal.aborted) return Promise.reject(signal.reason)
  return new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason))
  })
}

describe('when fetching through the catalyst fetch component', () => {
  let fetchSpy: jest.SpyInstance
  let init: FetchInit
  let forwardedSignal: AbortSignal

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch')
    init = {}
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  async function fetchWith(trigger: () => void = () => {}) {
    fetchSpy.mockImplementationOnce((url, options) => {
      forwardedSignal = options.signal
      return pendingUntilAborted(url, options)
    })
    const pending = createFetchComponent()
      .fetch('https://peer.example.org/content/entities', init)
      .catch((e) => e)
    trigger()
    await pending
  }

  describe('and the caller aborts its signal', () => {
    beforeEach(async () => {
      const controller = new AbortController()
      init = { signal: controller.signal }
      await fetchWith(() => controller.abort())
    })

    it('should abort the request', () => {
      expect(forwardedSignal.aborted).toBe(true)
    })
  })

  describe('and the caller aborts its abort controller', () => {
    beforeEach(async () => {
      const controller = new AbortController()
      init = { abortController: controller }
      await fetchWith(() => controller.abort())
    })

    it('should abort the request', () => {
      expect(forwardedSignal.aborted).toBe(true)
    })
  })

  describe('and the caller gives both a signal and an abort controller', () => {
    beforeEach(async () => {
      const controller = new AbortController()
      init = { signal: new AbortController().signal, abortController: controller }
      await fetchWith(() => controller.abort())
    })

    it('should abort the request when either of them aborts', () => {
      expect(forwardedSignal.aborted).toBe(true)
    })
  })

  describe('and the signal was aborted before the request', () => {
    beforeEach(async () => {
      init = { signal: AbortSignal.abort() }
      await fetchWith()
    })

    it('should abort the request right away', () => {
      expect(forwardedSignal.aborted).toBe(true)
    })
  })

  describe('and the request outlives its timeout', () => {
    beforeEach(async () => {
      init = { timeout: 10 }
      await fetchWith()
    })

    it('should abort the request', () => {
      expect(forwardedSignal.aborted).toBe(true)
    })
  })

  describe('and the request completes before the caller aborts', () => {
    let controller: AbortController
    let forwardedInit: RequestInit & { duplex?: string }

    beforeEach(async () => {
      controller = new AbortController()
      fetchSpy.mockImplementationOnce(async (_url, options) => {
        forwardedInit = options
        return new Response('ok')
      })
      await createFetchComponent().fetch('https://peer.example.org/content/entities', {
        method: 'POST',
        duplex: 'half',
        signal: controller.signal
      } as FetchInit)
      controller.abort()
    })

    it('should forward the other request options', () => {
      expect(forwardedInit).toEqual(expect.objectContaining({ method: 'POST', duplex: 'half' }))
    })

    it('should stop following the caller signal', () => {
      expect(forwardedInit.signal!.aborted).toBe(false)
    })
  })
})

describe('when checking whether an entity got published', () => {
  let fetchEntitiesByIds: jest.Mock
  let fetchSpy: jest.SpyInstance
  let result: unknown

  beforeEach(() => {
    fetchEntitiesByIds = jest.fn()
    fetchSpy = jest.spyOn(global, 'fetch')
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('and it was deployed to a catalyst', () => {
    describe('and the catalyst has it', () => {
      beforeEach(async () => {
        fetchEntitiesByIds.mockResolvedValueOnce([{ id: 'bafkreientity' }])
        result = await isEntityPublished({ fetchEntitiesByIds }, 'bafkreientity', { timeoutMs: 5000 })
      })

      it('should report it as published', () => {
        expect(result).toBe(true)
      })

      it('should bound the request with the timeout', () => {
        expect(fetchEntitiesByIds).toHaveBeenCalledWith(['bafkreientity'], { timeout: 5000 })
      })
    })

    describe('and the catalyst does not have it', () => {
      beforeEach(async () => {
        fetchEntitiesByIds.mockResolvedValueOnce([])
        result = await isEntityPublished({ fetchEntitiesByIds }, 'bafkreientity', { timeoutMs: 5000 })
      })

      it('should report it as not published', () => {
        expect(result).toBe(false)
      })
    })
  })

  describe('and it was deployed to a world', () => {
    const world = { name: 'my-world.dcl.eth', targetContent: 'https://worlds.example.org' }

    describe('and the world lists it among its scenes', () => {
      beforeEach(async () => {
        fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ scenes: [{ entityId: 'bafkreientity' }] })))
        result = await isEntityPublished({ fetchEntitiesByIds }, 'bafkreientity', { world, timeoutMs: 5000 })
      })

      it('should report it as published', () => {
        expect(result).toBe(true)
      })

      it('should query the world scenes by entity id', () => {
        expect(fetchSpy).toHaveBeenCalledWith(
          'https://worlds.example.org/world/my-world.dcl.eth/scenes?entity_id=bafkreientity',
          expect.objectContaining({ signal: expect.any(AbortSignal) })
        )
      })
    })

    describe('and the world does not list it', () => {
      beforeEach(async () => {
        fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({ scenes: [] })))
        result = await isEntityPublished({ fetchEntitiesByIds }, 'bafkreientity', { world, timeoutMs: 5000 })
      })

      it('should report it as not published', () => {
        expect(result).toBe(false)
      })
    })

    describe('and the world server fails', () => {
      beforeEach(async () => {
        fetchSpy.mockResolvedValueOnce(new Response('oops', { status: 503, statusText: 'Service Unavailable' }))
        result = await isEntityPublished({ fetchEntitiesByIds }, 'bafkreientity', { world, timeoutMs: 5000 }).catch(
          (e) => e
        )
      })

      it('should reject with the status', () => {
        expect(result).toEqual(new Error('Failed to fetch world scenes: 503 Service Unavailable'))
      })
    })

    describe('and the world server does not answer in time', () => {
      beforeEach(async () => {
        fetchSpy.mockImplementationOnce(pendingUntilAborted)
        result = await isEntityPublished({ fetchEntitiesByIds }, 'bafkreientity', { world, timeoutMs: 10 }).catch(
          (e) => e
        )
      })

      it('should reject with a timeout error', () => {
        expect(result).toEqual(expect.objectContaining({ name: 'TimeoutError' }))
      })
    })
  })
})

describe('when resolving the deploy token', () => {
  let token: string

  describe('and the CLI was given one', () => {
    beforeEach(() => {
      token = resolveDeployToken('creator-hub-token')
    })

    it('should use the given token', () => {
      expect(token).toBe('creator-hub-token')
    })
  })

  describe('and the CLI was not given one', () => {
    let another: string

    beforeEach(() => {
      token = resolveDeployToken()
      another = resolveDeployToken()
    })

    it('should generate a 128-bit hex token', () => {
      expect(token).toMatch(/^[0-9a-f]{32}$/)
    })

    it('should generate a different token each run', () => {
      expect(token).not.toBe(another)
    })
  })
})

describe('when building the linker URI', () => {
  let uri: string

  beforeEach(() => {
    uri = deployLinkerUri('a1b2c3')
  })

  it('should carry the deploy token', () => {
    expect(uri).toBe('/?token=a1b2c3')
  })
})
