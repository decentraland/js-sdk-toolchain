import { Router } from '@well-known-components/http-server'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { PreviewComponents } from '../types'
import { CliComponents } from '../../../components'
import { Workspace } from '../../../logic/workspace-validations'
import {
  getMergedEnv,
  setEnvValue,
  deleteEnvValue,
  getWorldStorage,
  getWorldValue,
  setWorldValue,
  deleteWorldValue,
  getPlayerStorage,
  getPlayerValue,
  setPlayerValue,
  deletePlayerValue,
  STORAGE_LIMITS,
  StorageLimitExceededError,
  StorageLimits
} from './runtime-env'

/** Keys live in varchar(255) columns on the deployed service. */
const MAX_KEY_LENGTH = 255
/** At most this many entries per page; also the fallback for a missing or invalid limit. */
const MAX_PAGE_SIZE = 100
/** The deployed pagination helper caps offsets here. */
const MAX_OFFSET = 100000
/** Slack the deployed service allows on top of the per-value limit for the request envelope. */
const BODY_ENVELOPE_SLACK_BYTES = 1024
const ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/
/** A `\u0000` escape in JSON.stringify output that is not an escaped backslash followed by the text `u0000`. */
const NUL_ESCAPE = /(?<!\\)(?:\\\\)*\\u0000/
const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/

type Response = IHttpServerComponent.IResponse

/** The deployed service orders by its database collation, which can differ for non-ASCII and mixed case. */
function compareByCodePoint(a: string, b: string): number {
  const left = [...a]
  const right = [...b]
  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    const difference = left[i].codePointAt(0)! - right[i].codePointAt(0)!
    if (difference !== 0) return difference
  }
  return left.length - right.length
}

function hasLoneSurrogate(value: unknown): boolean {
  if (typeof value === 'string') return LONE_SURROGATE.test(value)
  if (Array.isArray(value)) return value.some(hasLoneSurrogate)
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).some(([key, item]) => LONE_SURROGATE.test(key) || hasLoneSurrogate(item))
  }
  return false
}

/**
 * Sets up storage-related endpoints for environment variables, scene storage, and player storage.
 */
export function setupStorageEndpoints(
  components: CliComponents,
  router: Router<PreviewComponents>,
  workspace: Workspace
) {
  const withKeyValidation: IHttpServerComponent.IRequestHandler<
    IHttpServerComponent.PathAwareContext<PreviewComponents, string>
  > = async (ctx, next) => {
    const { key } = ctx.params
    if (!key || [...key].length > MAX_KEY_LENGTH) {
      return { status: 400, body: { message: `Key must be between 1 and ${MAX_KEY_LENGTH} characters` } }
    }
    return next()
  }

  const withAddressValidation: IHttpServerComponent.IRequestHandler<
    IHttpServerComponent.PathAwareContext<PreviewComponents, string>
  > = async (ctx, next) => {
    const address = (ctx.params.address ?? '').toLowerCase()
    if (!ADDRESS_PATTERN.test(address)) {
      return { status: 400, body: { message: 'Invalid player address' } }
    }
    ctx.params.address = address
    return next()
  }

  const badRequest = (message: string): Response => ({ status: 400, body: { message } })
  const invalidBody = () => badRequest('Invalid JSON body')

  function serverError(what: string, error: unknown): Response {
    components.logger.error(`Failed to ${what}: ${error}`)
    return { status: 500, body: { message: `Failed to ${what}` } }
  }

  /** The body must be exactly `{ value }`. */
  function readValueFromBody(bodyText: string): { ok: true; value: unknown } | { ok: false } {
    let parsed: unknown
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      return { ok: false }
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return { ok: false }
    const keys = Object.keys(parsed)
    if (keys.length !== 1 || keys[0] !== 'value') return { ok: false }
    return { ok: true, value: (parsed as { value: unknown }).value }
  }

  async function readPut(
    ctx: { request: { text(): Promise<string> } },
    limits: StorageLimits,
    options: { stringOnly?: boolean; allowNul?: boolean } = {}
  ): Promise<{ value: unknown } | { response: Response }> {
    const bodyText = await ctx.request.text()
    if (Buffer.byteLength(bodyText, 'utf-8') > limits.maxValueSizeBytes + BODY_ENVELOPE_SLACK_BYTES) {
      return { response: { status: 413, body: { message: 'Request body is too large' } } }
    }
    const parsed = readValueFromBody(bodyText)
    if (!parsed.ok || (options.stringOnly && typeof parsed.value !== 'string')) return { response: invalidBody() }
    if (!options.allowNul && NUL_ESCAPE.test(JSON.stringify(parsed.value))) {
      return { response: badRequest('Values must not contain the \\u0000 (NUL) character') }
    }
    if (hasLoneSurrogate(parsed.value)) return { response: badRequest('Values must not contain unpaired surrogates') }
    return { value: parsed.value }
  }

  async function write(what: string, store: () => Promise<void>, success: Response): Promise<Response> {
    try {
      await store()
      return success
    } catch (error) {
      if (error instanceof StorageLimitExceededError) return badRequest(error.message)
      return serverError(what, error)
    }
  }

  function listPage(values: Record<string, unknown>, searchParams: URLSearchParams): Response {
    const prefix = searchParams.get('prefix')
    const matching = Object.entries(values)
      .filter(([key]) => !prefix || key.startsWith(prefix))
      .sort(([a], [b]) => compareByCodePoint(a, b))
      .map(([key, value]) => ({ key, value }))
    const requestedLimit = parseInt(searchParams.get('limit') ?? '', 10)
    const limit =
      Number.isNaN(requestedLimit) || requestedLimit <= 0 || requestedLimit > MAX_PAGE_SIZE
        ? MAX_PAGE_SIZE
        : requestedLimit
    const offset = Math.min(MAX_OFFSET, Math.max(0, parseInt(searchParams.get('offset') ?? '', 10) || 0))
    return {
      body: JSON.stringify({
        data: matching.slice(offset, offset + limit),
        pagination: { limit, offset, total: matching.length }
      })
    }
  }

  // Environment variables endpoints (/env/:key)
  router.get('/env/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params
    try {
      const value = (await getMergedEnv(components, workspace.projects[0].workingDirectory)).get(key)
      if (value === undefined) return { status: 404, body: { message: `Environment variable '${key}' not found` } }
      return { body: JSON.stringify({ value }) }
    } catch (error) {
      return serverError(`get environment variable '${key}'`, error)
    }
  })

  router.put('/env/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params
    try {
      // Env values are strings, and may contain NUL.
      const put = await readPut(ctx, STORAGE_LIMITS.env, { stringOnly: true, allowNul: true })
      if ('response' in put) return put.response
      return write(`set environment variable '${key}'`, () => setEnvValue(components, key, put.value as string), {
        status: 204
      })
    } catch (error) {
      return serverError(`set environment variable '${key}'`, error)
    }
  })

  router.delete('/env/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params
    return write(`delete environment variable '${key}'`, () => deleteEnvValue(components, key).then(() => {}), {
      status: 204
    })
  })

  // Scene Storage list endpoint (GET /values, optional ?prefix=&limit=&offset=)
  router.get('/values', async (ctx) => {
    try {
      return listPage(await getWorldStorage(components), ctx.url.searchParams)
    } catch (error) {
      return serverError('list storage values', error)
    }
  })

  // Scene Storage endpoints (/values/:key)
  router.get('/values/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params
    try {
      const value = await getWorldValue(components, key)
      if (value === undefined) return { status: 404, body: { message: `Storage key '${key}' not found` } }
      return { body: JSON.stringify({ value }) }
    } catch (error) {
      return serverError(`get storage value '${key}'`, error)
    }
  })

  router.put('/values/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params
    try {
      const put = await readPut(ctx, STORAGE_LIMITS.world)
      if ('response' in put) return put.response
      return write(`set storage value '${key}'`, () => setWorldValue(components, key, put.value), {
        body: JSON.stringify({ value: put.value })
      })
    } catch (error) {
      return serverError(`set storage value '${key}'`, error)
    }
  })

  router.delete('/values/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params
    return write(`delete storage value '${key}'`, () => deleteWorldValue(components, key).then(() => {}), {
      status: 204
    })
  })

  // Player Storage list endpoint (GET /players/:address/values, optional ?prefix=&limit=&offset=)
  router.get('/players/:address/values', withAddressValidation, async (ctx) => {
    const { address } = ctx.params
    try {
      return listPage(await getPlayerStorage(components, address), ctx.url.searchParams)
    } catch (error) {
      return serverError(`list player storage values for '${address}'`, error)
    }
  })

  // Player Storage endpoints (/players/:address/values/:key)
  router.get('/players/:address/values/:key', withAddressValidation, withKeyValidation, async (ctx) => {
    const { address, key } = ctx.params
    try {
      const value = await getPlayerValue(components, address, key)
      if (value === undefined) {
        return { status: 404, body: { message: `Player storage key '${key}' not found for '${address}'` } }
      }
      return { body: JSON.stringify({ value }) }
    } catch (error) {
      return serverError(`get player storage value '${key}' for '${address}'`, error)
    }
  })

  router.put('/players/:address/values/:key', withAddressValidation, withKeyValidation, async (ctx) => {
    const { address, key } = ctx.params
    try {
      const put = await readPut(ctx, STORAGE_LIMITS.player)
      if ('response' in put) return put.response
      return write(
        `set player storage value '${key}' for '${address}'`,
        () => setPlayerValue(components, address, key, put.value),
        { body: JSON.stringify({ value: put.value }) }
      )
    } catch (error) {
      return serverError(`set player storage value '${key}' for '${address}'`, error)
    }
  })

  router.delete('/players/:address/values/:key', withAddressValidation, withKeyValidation, async (ctx) => {
    const { address, key } = ctx.params
    return write(
      `delete player storage value '${key}' for '${address}'`,
      () => deletePlayerValue(components, address, key).then(() => {}),
      { status: 204 }
    )
  })
}
