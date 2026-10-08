import { resolve } from 'path'
import { Options } from './types'
import { CliError } from '../../logic/error'
import { printError, printSuccess } from '../../logic/beautiful-logs'
import {
  setupStorageCommand,
  createStorageInfo,
  makeAuthenticatedRequest,
  confirmAction,
  getLinkerDappOptions
} from './shared'

/**
 * Handles environment variable operations in the server-side storage service (set, delete, clear)
 */
export const handleEnv = async (action: string, key: string | undefined, options: Options): Promise<void> => {
  const { logger, analytics } = options.components
  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')

  // Common setup: validate action, workspace, and world
  const { baseURL, worldName, baseParcel, parcels } = await setupStorageCommand(
    options.components,
    projectRoot,
    action,
    options.args['--target'],
    ['set', 'delete', 'clear']
  )

  // Linker dApp options
  const linkOptions = getLinkerDappOptions(options.args)

  // Handle actions
  if (action === 'set') {
    // SET operation
    if (!key) {
      throw new CliError('STORAGE_MISSING_KEY', 'Missing KEY argument. Usage: storage env set KEY --value VALUE')
    }

    const value = options.args['--value']
    if (value === undefined) {
      throw new CliError('STORAGE_MISSING_VALUE', 'Missing --value option. Usage: storage env set KEY --value VALUE')
    }

    logger.info(`Setting environment variable '${key}' to ${baseURL}`)

    const url = `${baseURL}/env/${encodeURIComponent(key)}`
    const info = createStorageInfo('env', 'set', url, worldName, baseParcel, parcels, key, value)

    const result = await makeAuthenticatedRequest(options.components, info, linkOptions, 'PUT', url, { value })

    if (result.success) {
      analytics.track('Storage Env Set Success', { key })
      printSuccess(logger, `Environment variable '${key}' set successfully!`, '')
    } else {
      analytics.track('Storage Env Set Failure', { key })
      printError(logger, `Failed to set environment variable '${key}':`, new Error(result.error || 'Unknown error'))
    }
  } else if (action === 'delete') {
    // DELETE operation
    if (!key) {
      throw new CliError('STORAGE_MISSING_KEY', 'Missing KEY argument. Usage: storage env delete KEY')
    }

    logger.info(`Deleting environment variable '${key}' from ${baseURL}`)

    const url = `${baseURL}/env/${encodeURIComponent(key)}`
    const info = createStorageInfo('env', 'delete', url, worldName, baseParcel, parcels, key)

    const result = await makeAuthenticatedRequest(options.components, info, linkOptions, 'DELETE', url)

    if (result.success) {
      analytics.track('Storage Env Delete Success', { key })
      printSuccess(logger, `Environment variable '${key}' deleted successfully!`, '')
    } else {
      analytics.track('Storage Env Delete Failure', { key })
      printError(logger, `Failed to delete environment variable '${key}':`, new Error(result.error || 'Unknown error'))
    }
  } else if (action === 'clear') {
    // CLEAR operation
    const hasConfirm = options.args['--confirm']

    if (!hasConfirm) {
      const confirmed = await confirmAction(
        'Are you sure you want to delete ALL environment variables? This cannot be undone.'
      )
      if (!confirmed) {
        logger.info('Operation cancelled.')
        return
      }
    }

    logger.info(`Clearing all environment variables from ${baseURL}`)

    const url = `${baseURL}/env`
    const info = createStorageInfo('env', 'clear', url, worldName, baseParcel, parcels)

    const result = await makeAuthenticatedRequest(options.components, info, linkOptions, 'DELETE', url, undefined, {
      'X-Confirm-Delete-All': 'true'
    })

    if (result.success) {
      analytics.track('Storage Env Clear Success', {})
      printSuccess(logger, 'All environment variables cleared successfully!', '')
    } else {
      analytics.track('Storage Env Clear Failure', {})
      printError(logger, 'Failed to clear environment variables:', new Error(result.error || 'Unknown error'))
    }
  }
}
