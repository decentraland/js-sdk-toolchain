import { Result } from 'arg'
import { declareArgs } from '../../logic/args'
import { CliComponents } from '../../components'
import { CliError } from '../../logic/error'
import { handleEnv } from './env'
import { handleScene } from './scene'
import { handlePlayer } from './player'

export interface Options {
  args: Result<typeof args>
  components: CliComponents
}

export const args = declareArgs({
  '--help': Boolean,
  '-h': '--help',
  '--dir': String,
  '--target': String,
  '-t': '--target',
  '--port': Number,
  '-p': '--port',
  '--https': Boolean,
  '--no-browser': Boolean,
  '-b': '--no-browser',
  '--value': String,
  '-v': '--value',
  '--address': String,
  '-a': '--address',
  '--confirm': Boolean,
  '-c': '--confirm'
})

const STORAGE_SERVER_ORG = 'https://storage.decentraland.org'

export function help(options: Options) {
  options.components.logger.log(`
  Usage: 'sdk-commands storage [subcommand] [action] [KEY] [options]'
    Manages server-side storage including environment variables, scene storage, and player storage.
    Requires a scene.json with worldConfiguration.name in the project directory.

    Subcommands:
      env       Manage environment variables
      scene     Manage scene storage
      player    Manage player storage

    Options:
      -h, --help                Displays complete help
      -v, --value       [value] The value to set for a storage key
      -a, --address     [addr]  Player address (for player storage operations)
      -c, --confirm             Skip confirmation prompts for destructive operations
      -t, --target      [URL]   Target storage server URL (default: ${STORAGE_SERVER_ORG})
      --dir             [path]  Path to the project directory
      -p, --port        [port]  Select a custom port for the linker dApp
      -b, --no-browser          Do not open a new browser window
      --https                   Use HTTPS for the linker dApp

    Target options:
      - https://storage.decentraland.org  (production - default)
      - https://storage.decentraland.zone (staging)
      - http://localhost:<port>                  (local development)

    Environment Variables (storage env):
      storage env set KEY --value VALUE    Set an environment variable
      storage env delete KEY               Delete an environment variable
      storage env clear --confirm          Delete all environment variables

    Scene Storage (storage scene):
      storage scene set KEY --value VALUE  Set a scene storage value
      storage scene get KEY                Get a scene storage value
      storage scene delete KEY             Delete a scene storage value
      storage scene clear --confirm        Delete all scene storage data

    Player Storage (storage player):
      storage player set KEY --value VALUE --address 0xABCD    Set a player storage value
      storage player get KEY --address 0xABCD                  Get a player storage value
      storage player delete KEY --address 0xABCD               Delete a player storage value
      storage player clear --address 0xABCD --confirm          Delete all data for a player
      storage player clear --confirm                           Delete all player data (all players)

    Examples:
    - Set an environment variable:
      $ sdk-commands storage env set API_KEY --value "my-secret-key"

    - Get a scene storage value:
      $ sdk-commands storage scene get high_score

    - Set player storage:
      $ sdk-commands storage player set level --value 10 --address 0x1234...

    - Clear all environment variables with confirmation:
      $ sdk-commands storage env clear --confirm

    - Deploy to staging:
      $ sdk-commands storage env set MY_KEY --value my_value --target https://storage.decentraland.zone

    - Deploy to local development server:
      $ sdk-commands storage scene set test_key --value test_value --target http://localhost:8000
`)
}

export async function main(options: Options) {
  // Parse positional arguments: storage [subcommand] [action] [KEY?]
  const positionalArgs = options.args._.filter((arg) => !arg.startsWith('-'))

  if (positionalArgs.length === 0) {
    throw new CliError(
      'STORAGE_MISSING_SUBCOMMAND',
      'Missing subcommand. Usage: storage [env|scene|player] [action] [KEY] [options]\nRun "sdk-commands storage --help" for more information.'
    )
  }

  const [subcommand, action, key] = positionalArgs

  // Validate subcommand
  if (!['env', 'scene', 'player'].includes(subcommand)) {
    throw new CliError(
      'STORAGE_INVALID_SUBCOMMAND',
      `Invalid subcommand '${subcommand}'. Use: env, scene, or player\nRun "sdk-commands storage --help" for more information.`
    )
  }

  // Validate action is provided
  if (!action) {
    throw new CliError(
      'STORAGE_MISSING_ACTION',
      `Missing action for '${subcommand}'. Run "sdk-commands storage --help" for more information.`
    )
  }

  // Route to appropriate handler
  try {
    if (subcommand === 'env') {
      await handleEnv(action, key, options)
    } else if (subcommand === 'scene') {
      await handleScene(action, key, options)
    } else if (subcommand === 'player') {
      await handlePlayer(action, key, options)
    }
  } catch (error) {
    if (error instanceof CliError) {
      throw error
    }
    throw new CliError('STORAGE_OPERATION_FAILED', `Storage operation failed: ${(error as Error).message}`)
  }
}
