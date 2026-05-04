import { Result } from 'arg'
import { isAddress } from 'eth-connect'
import i18next from 'i18next'

import { CliComponents } from '../../components'
import { declareArgs } from '../../logic/args'
import { CliError } from '../../logic/error'
import { printProgressInfo, printSuccess } from '../../logic/beautiful-logs'
import { dAppOptions } from '../../run-dapp'
import { DEFAULT_WORLDS_CONTENT_SERVER, executeSignedRequest, fetchWorldDeploymentPermissions } from './utils'

interface Options {
  args: Result<typeof args>
  components: CliComponents
}

export const args = declareArgs({
  '--help': Boolean,
  '-h': '--help',
  '--world': String,
  '-w': '--world',
  '--address': [String],
  '-a': '--address',
  '--parcels': String,
  '--target-content': String,
  '-t': '--target-content',
  '--no-browser': Boolean,
  '-b': '--no-browser',
  '--port': Number,
  '-p': '--port',
  '--https': Boolean
})

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands world-permissions [options]'
    Options:
      -h,  --help                      Displays complete help
      -w,  --world     [name]          World NAME to grant access to (e.g. "myworld.dcl.eth") — required
      -a,  --address   [address]       Collaborator wallet address — can be specified multiple times
           --parcels   [list]          Optional: restrict collaborator access to specific parcels.
                                       Provide as space-separated "x,y" coordinates (e.g. "0,0 1,0 -1,2").
                                       Omitting this flag grants access to the entire world.
      -t,  --target-content [url]      Worlds content server URL.
                                       Defaults to ${DEFAULT_WORLDS_CONTENT_SERVER}
      -b,  --no-browser                Do not open a new browser window
      -p,  --port      [port]          Select a custom port for the linker dapp
           --https                     Use HTTPS for the linker dapp

    Examples:
    - Grant world-wide collaborator access to two wallets:
      $ sdk-commands world-permissions --world myworld.dcl.eth --address 0x1234... --address 0x5678...
    - Grant access restricted to specific parcels:
      $ sdk-commands world-permissions --world myworld.dcl.eth --address 0x1234... --parcels "0,0 1,0 1,1"
  `)
}

export async function main(options: Options): Promise<void> {
  const worldName = options.args['--world']
  const addresses = options.args['--address'] ?? []
  const parcelsArg = options.args['--parcels']
  const targetContent = options.args['--target-content'] ?? DEFAULT_WORLDS_CONTENT_SERVER
  const openBrowser = !options.args['--no-browser']
  const linkerPort = options.args['--port']
  const isHttps = !!options.args['--https']

  const linkerOpts: Omit<dAppOptions, 'uri'> = { openBrowser, linkerPort, isHttps }
  const { logger } = options.components

  // Validate required args
  if (!worldName) {
    throw new CliError('WORLD_PERMISSIONS_MISSING_WORLD', i18next.t('errors.world_permissions.missing_world'))
  }

  if (addresses.length === 0) {
    throw new CliError('WORLD_PERMISSIONS_MISSING_ADDRESS', i18next.t('errors.world_permissions.missing_address'))
  }

  // Validate all addresses are valid EVM addresses
  for (const addr of addresses) {
    if (!isAddress(addr)) {
      throw new CliError(
        'WORLD_PERMISSIONS_INVALID_ADDRESS',
        i18next.t('errors.world_permissions.invalid_address', { address: addr })
      )
    }
  }

  // Parse and validate parcels if provided
  let parcels: string[] | undefined
  if (parcelsArg) {
    parcels = parcelsArg.split(/\s+/).filter(Boolean)
    const parcelRegex = /^-?\d+,-?\d+$/
    for (const parcel of parcels) {
      if (!parcelRegex.test(parcel)) {
        throw new CliError(
          'WORLD_PERMISSIONS_INVALID_PARCEL',
          i18next.t('errors.world_permissions.invalid_parcel', { parcel })
        )
      }
    }
  }

  logger.info(`Granting collaborator permissions for world "${worldName}"`)
  logger.info(`Addresses: ${addresses.join(', ')}`)
  if (parcels) {
    logger.info(`Parcels: ${parcels.join(', ')}`)
  } else {
    logger.info('Scope: entire world')
  }

  if (!parcels) {
    await grantWorldWidePermissions(options.components, linkerOpts, worldName, addresses, targetContent)
  } else {
    await grantParcelPermissions(options.components, linkerOpts, worldName, addresses, parcels, targetContent)
  }

  printSuccess(logger, 'Permissions granted successfully!', `World: ${worldName}`)
}

async function grantWorldWidePermissions(
  components: CliComponents,
  linkerOpts: Omit<dAppOptions, 'uri'>,
  worldName: string,
  newAddresses: string[],
  targetContent: string
): Promise<void> {
  const { logger } = components

  // Fetch existing permissions so we can merge rather than overwrite
  printProgressInfo(logger, 'Fetching current world permissions...')
  const existing = await fetchWorldDeploymentPermissions(components.fetch, targetContent, worldName)
  const existingWallets = (existing.wallets ?? []).map((w) => w.toLowerCase())
  const allWallets = Array.from(new Set([...existingWallets, ...newAddresses.map((a) => a.toLowerCase())]))

  const encodedName = encodeURIComponent(worldName)
  const url = `${targetContent}/world/${encodedName}/permissions/deployment`
  const metadata = { type: 'allow-list', wallets: allWallets }

  await executeSignedRequest(
    components,
    linkerOpts,
    { url, method: 'POST', metadata, worldName, displayAddresses: newAddresses.map((a) => a.toLowerCase()) },
    async (authchainHeaders) => {
      printProgressInfo(logger, 'Submitting permissions...')
      const response = await components.fetch.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authchainHeaders },
        body: JSON.stringify(metadata)
      })

      if (!response.ok) {
        const text = await response.text()
        throw new CliError(
          'WORLD_PERMISSIONS_GRANT_FAILED',
          i18next.t('errors.world_permissions.grant_failed', { error: `${response.status} ${text}` })
        )
      }
    }
  )
}

async function grantParcelPermissions(
  components: CliComponents,
  linkerOpts: Omit<dAppOptions, 'uri'>,
  worldName: string,
  addresses: string[],
  parcels: string[],
  targetContent: string
): Promise<void> {
  const { logger } = components
  const encodedName = encodeURIComponent(worldName)

  for (let i = 0; i < addresses.length; i++) {
    const address = addresses[i]
    if (addresses.length > 1) {
      logger.info(`\nSigning for address ${i + 1} of ${addresses.length}: ${address}`)
    }

    const url = `${targetContent}/world/${encodedName}/permissions/deployment/address/${address.toLowerCase()}/parcels`
    const metadata = { parcels }

    await executeSignedRequest(
      components,
      linkerOpts,
      {
        url,
        method: 'POST',
        metadata,
        worldName: `${worldName} (parcels: ${parcels.join(', ')})`,
        displayAddresses: [address.toLowerCase()]
      },
      async (authchainHeaders) => {
        printProgressInfo(logger, `Granting parcel access to ${address}...`)
        const response = await components.fetch.fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authchainHeaders },
          body: JSON.stringify(metadata)
        })

        if (!response.ok) {
          const text = await response.text()
          throw new CliError(
            'WORLD_PERMISSIONS_GRANT_FAILED',
            i18next.t('errors.world_permissions.grant_failed', { error: `${response.status} ${text}` })
          )
        }
      }
    )
  }
}
