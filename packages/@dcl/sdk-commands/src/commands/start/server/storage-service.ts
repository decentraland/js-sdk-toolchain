import { Router } from '@well-known-components/http-server'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { PreviewComponents } from '../types'
import { CliComponents } from '../../../components'
import { Workspace } from '../../../logic/workspace-validations'
import {
  getMergedEnv,
  setEnvValue,
  deleteEnvValue,
  loadServerStorage,
  getWorldValue,
  setWorldValue,
  deleteWorldValue,
  getPlayerValue,
  setPlayerValue,
  deletePlayerValue
} from './runtime-env'

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
    if (!ctx.params.key) {
      return { status: 400, body: { message: 'Key is required' } }
    }
    return next()
  }

  const withAddressValidation: IHttpServerComponent.IRequestHandler<
    IHttpServerComponent.PathAwareContext<PreviewComponents, string>
  > = async (ctx, next) => {
    if (!ctx.params.address) {
      return { status: 400, body: { message: 'Address is required' } }
    }
    return next()
  }

  // Environment variables endpoints (/env/:key)
  router.get('/env/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params

    const envVars = await getMergedEnv(components, workspace.projects[0].workingDirectory)
    const value = envVars.get(key)

    if (value === undefined) {
      return { status: 404, body: { message: `Environment variable '${key}' not found` } }
    }

    return { body: JSON.stringify({ value }) }
  })

  router.put('/env/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params

    try {
      const bodyText = await ctx.request.text()
      const { value } = JSON.parse(bodyText)
      await setEnvValue(components, key, value)
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
    const prefix = ctx.url.searchParams.get('prefix')
    const limitParam = ctx.url.searchParams.get('limit')
    const offsetParam = ctx.url.searchParams.get('offset')

    const storage = await loadServerStorage(components)
    let entries = Object.entries(storage.world).map(([key, value]) => ({ key, value }))

    if (prefix !== null && prefix !== '') {
      entries = entries.filter((entry) => entry.key.startsWith(prefix))
    }

    const total = entries.length
    const offset = offsetParam !== null ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0
    const limit = limitParam !== null ? Math.max(1, parseInt(limitParam, 10) || 0) : entries.length
    const paginatedEntries = limit > 0 ? entries.slice(offset, offset + limit) : entries.slice(offset)

    return { body: JSON.stringify({ data: paginatedEntries, pagination: { offset, total } }) }
  })

  // Scene Storage endpoints (/values/:key)
  router.get('/values/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params

    const value = await getWorldValue(components, key)
    if (value === undefined) {
      return { status: 404, body: { message: `Storage key '${key}' not found` } }
    }
    return { body: JSON.stringify({ value }) }
  })

  router.put('/values/:key', withKeyValidation, async (ctx) => {
    const { key } = ctx.params

    try {
      const bodyText = await ctx.request.text()
      const { value } = JSON.parse(bodyText)
      await setWorldValue(components, key, value)
      return { body: JSON.stringify({ value }) }
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
    const prefix = ctx.url.searchParams.get('prefix')
    const limitParam = ctx.url.searchParams.get('limit')
    const offsetParam = ctx.url.searchParams.get('offset')

    const storage = await loadServerStorage(components)
    const playerData = storage.players[address] ?? {}
    let entries = Object.entries(playerData).map(([key, value]) => ({ key, value }))

    if (prefix !== null && prefix !== '') {
      entries = entries.filter((entry) => entry.key.startsWith(prefix))
    }

    const total = entries.length
    const offset = offsetParam !== null ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0
    const limit = limitParam !== null ? Math.max(1, parseInt(limitParam, 10) || 0) : entries.length
    const paginatedEntries = limit > 0 ? entries.slice(offset, offset + limit) : entries.slice(offset)

    return { body: JSON.stringify({ data: paginatedEntries, pagination: { offset, total } }) }
  })

  // Player Storage endpoints (/players/:address/values/:key)
  router.get('/players/:address/values/:key', withAddressValidation, withKeyValidation, async (ctx) => {
    const { address, key } = ctx.params

    const value = await getPlayerValue(components, address, key)

    if (value === undefined) {
      return { status: 404, body: { message: `Player storage key '${key}' not found for '${address}'` } }
    }

    return { body: JSON.stringify({ value }) }
  })

  router.put('/players/:address/values/:key', withAddressValidation, withKeyValidation, async (ctx) => {
    const { address, key } = ctx.params

    try {
      const bodyText = await ctx.request.text()
      const { value } = JSON.parse(bodyText)

      await setPlayerValue(components, address, key, value)

      return { body: JSON.stringify({ value }) }
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
