import {
  checkWorldDeploymentPermission,
  createFetchComponent,
  deployLinkerUri,
  HttpStatusError,
  isEntityPublished,
  resolveDeployToken
} from '../../../../packages/@dcl/sdk-commands/src/commands/deploy/utils'
import { CliError } from '../../../../packages/@dcl/sdk-commands/src/logic/error'

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

  describe('and the caller rejects HTTP errors', () => {
    let error: unknown

    beforeEach(async () => {
      fetchSpy.mockResolvedValueOnce(new Response('oops', { status: 503 }))
      error = await createFetchComponent()
        .fetch('https://peer.example.org/content/available-content', { rejectHttpErrors: true })
        .catch((e) => e)
    })

    it('should reject with the HTTP status', () => {
      expect(error).toEqual(expect.objectContaining({ constructor: HttpStatusError, status: 503 }))
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

      it('should bound the request with a signal', () => {
        expect(fetchEntitiesByIds).toHaveBeenCalledWith(['bafkreientity'], { signal: expect.any(AbortSignal) })
      })
    })

    describe('and the catalyst stalls while sending the response body', () => {
      beforeEach(async () => {
        const stalledBody = new ReadableStream({ start: () => undefined })
        fetchSpy.mockResolvedValueOnce(new Response(stalledBody, { status: 200 }))
        const fetcher = createFetchComponent()
        fetchEntitiesByIds.mockImplementationOnce(async (_ids, options) =>
          (await fetcher.fetch('https://peer.example.org/content/entities/active', options)).json()
        )
        result = await isEntityPublished({ fetchEntitiesByIds }, 'bafkreientity', { timeoutMs: 20 }).catch((e) => e)
      })

      it('should reject with a timeout error', () => {
        expect(result).toEqual(expect.objectContaining({ name: 'TimeoutError' }))
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
      token = resolveDeployToken('creator-hub-token-0001')
    })

    it('should use the given token', () => {
      expect(token).toBe('creator-hub-token-0001')
    })
  })

  describe('and the CLI was given one shorter than 16 characters', () => {
    let error: unknown

    beforeEach(() => {
      try {
        resolveDeployToken('short-token')
      } catch (e) {
        error = e
      }
    })

    it('should reject it with a DEPLOY_INVALID_ARGUMENTS error', () => {
      expect(error).toEqual(
        expect.objectContaining({
          constructor: CliError,
          name: 'DEPLOY_INVALID_ARGUMENTS',
          message: expect.stringContaining('at least 16 characters')
        })
      )
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

  it('should carry the deploy token in the fragment', () => {
    expect(uri).toBe('/#token=a1b2c3')
  })
})

describe('when checking the world deployment permission', () => {
  let fetchSpy: jest.SpyInstance
  let controller: AbortController
  let error: unknown

  beforeEach(async () => {
    fetchSpy = jest.spyOn(global, 'fetch')
    fetchSpy.mockImplementationOnce(pendingUntilAborted)
    controller = new AbortController()
    const checking = checkWorldDeploymentPermission(
      { info: jest.fn() },
      'my-world.dcl.eth',
      '0x1',
      'https://worlds.example.org',
      ['0,0'],
      controller.signal
    ).catch((e) => e)
    controller.abort()
    error = await checking
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('and the deployment is cancelled while it runs', () => {
    it('should abort the request', () => {
      expect(error).toEqual(expect.objectContaining({ name: 'AbortError' }))
    })
  })
})
