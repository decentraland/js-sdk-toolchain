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
 * Handles player storage operations (get, set, delete, clear)
 */
export const handlePlayer = async (action: string, key: string | undefined, options: Options): Promise<void> => {
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

  // Get address (required for get/set/delete, optional for clear)
  const address = options.args['--address']

  // Linker dApp options
  const linkOptions = getLinkerDappOptions(options.args)

  // Handle actions
  if (action === 'get') {
    // GET operation
    if (!address) {
      throw new CliError(
        'STORAGE_MISSING_ADDRESS',
        'Missing --address option. Usage: storage player get KEY --address 0x...'
      )
    }

    if (!key) {
      throw new CliError('STORAGE_MISSING_KEY', 'Missing KEY argument. Usage: storage player get KEY --address 0x...')
    }

    logger.info(`Getting player storage value '${key}' for ${address} from ${baseURL}`)

    const url = `${baseURL}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`
    const info = createStorageInfo('get', url, worldName, baseParcel, parcels, key, undefined, address)

    const result = await makeAuthenticatedRequest(options.components, info, linkOptions, 'GET', url)

    if (result.success) {
      analytics.track('Storage Player Get Success', { key, address })
      logger.log(`\nValue for '${key}' (${address}):`)
      logger.log(JSON.stringify(result.data, null, 2))
    } else {
      analytics.track('Storage Player Get Failure', { key, address })
      printError(
        logger,
        `Failed to get player storage value '${key}' for ${address}:`,
        new Error(result.error || 'Unknown error')
      )
    }
  } else if (action === 'set') {
    // SET operation
    if (!address) {
      throw new CliError(
        'STORAGE_MISSING_ADDRESS',
        'Missing --address option. Usage: storage player set KEY --value VALUE --address 0x...'
      )
    }

    if (!key) {
      throw new CliError(
        'STORAGE_MISSING_KEY',
        'Missing KEY argument. Usage: storage player set KEY --value VALUE --address 0x...'
      )
    }

    const value = options.args['--value']
    if (value === undefined) {
      throw new CliError(
        'STORAGE_MISSING_VALUE',
        'Missing --value option. Usage: storage player set KEY --value VALUE --address 0x...'
      )
    }

    logger.info(`Setting player storage value '${key}' for ${address} to ${baseURL}`)

    const url = `${baseURL}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`
    const info = createStorageInfo('set', url, worldName, baseParcel, parcels, key, value, address)

    const result = await makeAuthenticatedRequest(options.components, info, linkOptions, 'PUT', url, { value })

    if (result.success) {
      analytics.track('Storage Player Set Success', { key, address })
      printSuccess(logger, `Player storage value '${key}' for ${address} set successfully!`, '')
    } else {
      analytics.track('Storage Player Set Failure', { key, address })
      printError(
        logger,
        `Failed to set player storage value '${key}' for ${address}:`,
        new Error(result.error || 'Unknown error')
      )
    }
  } else if (action === 'delete') {
    // DELETE operation
    if (!address) {
      throw new CliError(
        'STORAGE_MISSING_ADDRESS',
        'Missing --address option. Usage: storage player delete KEY --address 0x...'
      )
    }

    if (!key) {
      throw new CliError(
        'STORAGE_MISSING_KEY',
        'Missing KEY argument. Usage: storage player delete KEY --address 0x...'
      )
    }

    logger.info(`Deleting player storage value '${key}' for ${address} from ${baseURL}`)

    const url = `${baseURL}/players/${encodeURIComponent(address)}/values/${encodeURIComponent(key)}`
    const info = createStorageInfo('delete', url, worldName, baseParcel, parcels, key, undefined, address)

    const result = await makeAuthenticatedRequest(options.components, info, linkOptions, 'DELETE', url)

    if (result.success) {
      analytics.track('Storage Player Delete Success', { key, address })
      printSuccess(logger, `Player storage value '${key}' for ${address} deleted successfully!`, '')
    } else {
      analytics.track('Storage Player Delete Failure', { key, address })
      printError(
        logger,
        `Failed to delete player storage value '${key}' for ${address}:`,
        new Error(result.error || 'Unknown error')
      )
    }
  } else if (action === 'clear') {
    // CLEAR operation
    const hasConfirm = options.args['--confirm']

    if (address) {
      // Clear specific player
      if (!hasConfirm) {
        const confirmed = await confirmAction(
          `Are you sure you want to delete ALL storage data for player ${address}? This cannot be undone.`
        )
        if (!confirmed) {
          logger.info('Operation cancelled.')
          return
        }
      }

      logger.info(`Clearing all storage data for player ${address} from ${baseURL}`)

      const url = `${baseURL}/players/${encodeURIComponent(address)}/values`
      const info = createStorageInfo('clear', url, worldName, baseParcel, parcels, undefined, undefined, address)

      const result = await makeAuthenticatedRequest(options.components, info, linkOptions, 'DELETE', url, undefined, {
        'X-Confirm-Delete-All': 'true'
      })

      if (result.success) {
        analytics.track('Storage Player Clear Success', { address })
        printSuccess(logger, `All storage data for player ${address} cleared successfully!`, '')
      } else {
        analytics.track('Storage Player Clear Failure', { address })
        printError(
          logger,
          `Failed to clear storage data for player ${address}:`,
          new Error(result.error || 'Unknown error')
        )
      }
    } else {
      // Clear all players
      if (!hasConfirm) {
        const confirmed = await confirmAction(
          'Are you sure you want to delete ALL player storage data for ALL players? This cannot be undone.'
        )
        if (!confirmed) {
          logger.info('Operation cancelled.')
          return
        }
      }

      logger.info(`Clearing all player storage data from ${baseURL}`)

      const url = `${baseURL}/players`
      const info = createStorageInfo('clear', url, worldName, baseParcel, parcels)

      const result = await makeAuthenticatedRequest(options.components, info, linkOptions, 'DELETE', url, undefined, {
        'X-Confirm-Delete-All': 'true'
      })

      if (result.success) {
        analytics.track('Storage Player Clear All Success', {})
        printSuccess(logger, 'All player storage data cleared successfully!', '')
      } else {
        analytics.track('Storage Player Clear All Failure', {})
        printError(logger, 'Failed to clear all player storage data:', new Error(result.error || 'Unknown error'))
      }
    }
  }
}
