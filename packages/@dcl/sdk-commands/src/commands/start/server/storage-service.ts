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
  deletePlayerValue
} from './runtime-env'

/** Keys live in varchar(255) columns on the deployed service. */
const MAX_KEY_LENGTH = 255
/** The deployed service serves at most this many entries per page, and falls back to it for a missing or invalid limit. */
const MAX_PAGE_SIZE = 100
/** Postgres jsonb cannot store NUL; the deployed service rejects a serialized value carrying one (an unescaped \u0000 escape). */
const NUL_ESCAPE = /(?<!\\)(?:\\\\)*\\u0000/

type ListEntry = { key: string; value: unknown }

/**
 * Sets up storage-related endpoints for environment variables, scene storage, and player storage.
 * Everything a scene can observe follows the deployed world-storage-service, so a scene behaves
 * the same in preview and deployed.
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
    // The deployed service lowercases the address, then requires a 20-byte hex address.
    const address = (ctx.params.address ?? '').toLowerCase()
    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      return { status: 400, body: { message: 'Invalid player address' } }
    }
    ctx.params.address = address
    return next()
  }

  /** Same contract as the deployed service: the body must be an object carrying `value`. */
  function readValueFromBody(bodyText: string): { ok: true; value: unknown } | { ok: false } {
    let parsed: unknown
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      return { ok: false }
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed) || !('value' in parsed)) {
      return { ok: false }
    }
    return { ok: true, value: (parsed as { value: unknown }).value }
  }

  const invalidBody = () => ({ status: 400, body: { message: 'Invalid JSON body' } })

  const containsNul = (value: unknown) => NUL_ESCAPE.test(JSON.stringify(value))
  const invalidValue = () => ({ status: 400, body: { message: 'Values must not contain the \\u0000 (NUL) character' } })

  function listPage(entries: ListEntry[], searchParams: URLSearchParams) {
    const prefix = searchParams.get('prefix')
    const matching = (prefix ? entries.filter((entry) => entry.key.startsWith(prefix)) : entries).sort((a, b) =>
      a.key < b.key ? -1 : a.key > b.key ? 1 : 0
    )
    const requestedLimit = parseInt(searchParams.get('limit') ?? '', 10)
    const limit =
      Number.isNaN(requestedLimit) || requestedLimit <= 0 || requestedLimit > MAX_PAGE_SIZE
        ? MAX_PAGE_SIZE
        : requestedLimit
    const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '', 10) || 0)
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
      const envVars = await getMergedEnv(components, workspace.projects[0].workingDirectory)
      const value = envVars.get(key)

      if (value === undefined) {
        return { status: 404, body: { message: `Environment variable '${key}' not found` } }
      }

      return { body: JSON.stringify({ value }) }
    } catch (error) {
      components.logger.error(`Failed to get environment variable '${key}': ${error}`)
      return { status: 500, body: { message: `Failed to get environment variable '${key}'` } }
    }
  })

  router.put('/env/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params

    try {
      const parsed = readValueFromBody(await ctx.request.text())
      // The deployed service only accepts a string here.
      if (!parsed.ok || typeof parsed.value !== 'string') return invalidBody()
      await setEnvValue(components, key, parsed.value)
      return { status: 204 }
    } catch (error) {
      components.logger.error(`Failed to set environment variable '${key}': ${error}`)
      return { status: 500, body: { message: `Failed to set environment variable '${key}'` } }
    }
  })

  router.delete('/env/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params

    try {
      await deleteEnvValue(components, key)
      return { status: 204 }
    } catch (error) {
      components.logger.error(`Failed to delete environment variable '${key}': ${error}`)
      return { status: 500, body: { message: `Failed to delete environment variable '${key}'` } }
    }
  })

  // Scene Storage list endpoint (GET /values, optional ?prefix=&limit=&offset=)
  router.get('/values', async (ctx) => {
    try {
      const world = await getWorldStorage(components)
      return listPage(
        Object.entries(world).map(([key, value]) => ({ key, value })),
        ctx.url.searchParams
      )
    } catch (error) {
      components.logger.error(`Failed to list storage values: ${error}`)
      return { status: 500, body: { message: 'Failed to list storage values' } }
    }
  })

  // Scene Storage endpoints (/values/:key)
  router.get('/values/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params

    try {
      const value = await getWorldValue(components, key)
      if (value === undefined) {
        return { status: 404, body: { message: `Storage key '${key}' not found` } }
      }
      return { body: JSON.stringify({ value }) }
    } catch (error) {
      components.logger.error(`Failed to get storage value '${key}': ${error}`)
      return { status: 500, body: { message: `Failed to get storage value '${key}'` } }
    }
  })

  router.put('/values/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params

    try {
      const parsed = readValueFromBody(await ctx.request.text())
      if (!parsed.ok) return invalidBody()
      if (containsNul(parsed.value)) return invalidValue()
      await setWorldValue(components, key, parsed.value)
      return { body: JSON.stringify({ value: parsed.value }) }
    } catch (error) {
      components.logger.error(`Failed to set storage value '${key}': ${error}`)
      return { status: 500, body: { message: `Failed to set storage value '${key}'` } }
    }
  })

  router.delete('/values/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params

    try {
      await deleteWorldValue(components, key)
      return { status: 204 }
    } catch (error) {
      components.logger.error(`Failed to delete storage value '${key}': ${error}`)
      return { status: 500, body: { message: `Failed to delete storage value '${key}'` } }
    }
  })

  // Player Storage list endpoint (GET /players/:address/values, optional ?prefix=&limit=&offset=)
  router.get('/players/:address/values', withAddressValidation, async (ctx) => {
    const { address } = ctx.params

    try {
      const playerData = await getPlayerStorage(components, address)
      return listPage(
        Object.entries(playerData).map(([key, value]) => ({ key, value })),
        ctx.url.searchParams
      )
    } catch (error) {
      components.logger.error(`Failed to list player storage values for '${address}': ${error}`)
      return { status: 500, body: { message: `Failed to list player storage values for '${address}'` } }
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
      components.logger.error(`Failed to get player storage value '${key}' for '${address}': ${error}`)
      return { status: 500, body: { message: `Failed to get player storage value '${key}' for '${address}'` } }
    }
  })

  router.put('/players/:address/values/:key', withAddressValidation, withKeyValidation, async (ctx) => {
    const { address, key } = ctx.params

    try {
      const parsed = readValueFromBody(await ctx.request.text())
      if (!parsed.ok) return invalidBody()
      if (containsNul(parsed.value)) return invalidValue()

      await setPlayerValue(components, address, key, parsed.value)

      return { body: JSON.stringify({ value: parsed.value }) }
    } catch (error) {
      components.logger.error(`Failed to set player storage value '${key}' for '${address}': ${error}`)
      return { status: 500, body: { message: `Failed to set player storage value '${key}' for '${address}'` } }
    }
  })

  router.delete('/players/:address/values/:key', withAddressValidation, withKeyValidation, async (ctx) => {
    const { address, key } = ctx.params

    try {
      await deletePlayerValue(components, address, key)
      return { status: 204 }
    } catch (error) {
      components.logger.error(`Failed to delete player storage value '${key}' for '${address}': ${error}`)
      return { status: 500, body: { message: `Failed to delete player storage value '${key}' for '${address}'` } }
    }
  })
}
