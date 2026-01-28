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
 * Handles scene storage operations (get, set, delete, clear)
 */
export const handleScene = async (action: string, key: string | undefined, options: Options): Promise<void> => {
  const { logger, analytics } = options.components
  const projectRoot = resolve(process.cwd(), options.args['--dir'] || '.')

  // Common setup: validate action, workspace, and world
  const { baseURL, worldName, baseParcel, parcels } = await setupStorageCommand(
    options.components,
    projectRoot,
    action,
    options.args['--target'],
    ['get', 'set', 'delete', 'clear']
  )

  // Linker dApp options
  const linkOptions = getLinkerDappOptions(options.args)

  // Handle actions
  if (action === 'get') {
    // GET operation
    if (!key) {
      throw new CliError('STORAGE_MISSING_KEY', 'Missing KEY argument. Usage: storage scene get KEY')
    }

    logger.info(`Getting scene storage value '${key}' from ${baseURL}`)

    const url = `${baseURL}/values/${encodeURIComponent(key)}`
    const info = createStorageInfo('get', url, worldName, baseParcel, parcels, key)

    const result = await makeAuthenticatedRequest(options.components, info, linkOptions, 'GET', url)

    if (result.success) {
      analytics.track('Storage Scene Get Success', { key })
      logger.log(`\nValue for '${key}':`)
      logger.log(JSON.stringify(result.data, null, 2))
    } else {
      analytics.track('Storage Scene Get Failure', { key })
      printError(logger, `Failed to get scene storage value '${key}':`, new Error(result.error || 'Unknown error'))
    }
  } else if (action === 'set') {
    // SET operation
    if (!key) {
      throw new CliError('STORAGE_MISSING_KEY', 'Missing KEY argument. Usage: storage scene set KEY --value VALUE')
    }

    const value = options.args['--value']
    if (value === undefined) {
      throw new CliError('STORAGE_MISSING_VALUE', 'Missing --value option. Usage: storage scene set KEY --value VALUE')
    }

    logger.info(`Setting scene storage value '${key}' to ${baseURL}`)

    const url = `${baseURL}/values/${encodeURIComponent(key)}`
    const info = createStorageInfo('set', url, worldName, baseParcel, parcels, key, value)

    const result = await makeAuthenticatedRequest(options.components, info, linkOptions, 'PUT', url, { value })

    if (result.success) {
      analytics.track('Storage Scene Set Success', { key })
      printSuccess(logger, `Scene storage value '${key}' set successfully!`, '')
    } else {
      analytics.track('Storage Scene Set Failure', { key })
      printError(logger, `Failed to set scene storage value '${key}':`, new Error(result.error || 'Unknown error'))
    }
  } else if (action === 'delete') {
    // DELETE operation
    if (!key) {
      throw new CliError('STORAGE_MISSING_KEY', 'Missing KEY argument. Usage: storage scene delete KEY')
    }

    logger.info(`Deleting scene storage value '${key}' from ${baseURL}`)

    const url = `${baseURL}/values/${encodeURIComponent(key)}`
    const info = createStorageInfo('delete', url, worldName, baseParcel, parcels, key)

    const result = await makeAuthenticatedRequest(options.components, info, linkOptions, 'DELETE', url)

    if (result.success) {
      analytics.track('Storage Scene Delete Success', { key })
      printSuccess(logger, `Scene storage value '${key}' deleted successfully!`, '')
    } else {
      analytics.track('Storage Scene Delete Failure', { key })
      printError(logger, `Failed to delete scene storage value '${key}':`, new Error(result.error || 'Unknown error'))
    }
  } else if (action === 'clear') {
    // CLEAR operation
    const hasConfirm = options.args['--confirm']

    if (!hasConfirm) {
      const confirmed = await confirmAction(
        'Are you sure you want to delete ALL scene storage data? This cannot be undone.'
      )
      if (!confirmed) {
        logger.info('Operation cancelled.')
        return
      }
    }

    logger.info(`Clearing all scene storage data from ${baseURL}`)

    const url = `${baseURL}/values`
    const info = createStorageInfo('clear', url, worldName, baseParcel, parcels)

    const result = await makeAuthenticatedRequest(options.components, info, linkOptions, 'DELETE', url, undefined, {
      'X-Confirm-Delete-All': 'true'
    })

    if (result.success) {
      analytics.track('Storage Scene Clear Success', {})
      printSuccess(logger, 'All scene storage data cleared successfully!', '')
    } else {
      analytics.track('Storage Scene Clear Failure', {})
      printError(logger, 'Failed to clear scene storage data:', new Error(result.error || 'Unknown error'))
    }
  }
}
