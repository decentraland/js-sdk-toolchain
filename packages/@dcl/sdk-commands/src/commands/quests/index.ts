import { Result } from 'arg'
import fetch from 'node-fetch'
import { isAddress } from 'eth-connect'
import { validate } from 'uuid'
import { declareArgs } from '../../logic/args'
import { CliComponents } from '../../components'
import { createQuestByPrompting, executeSubcommand, urlRegex, validateCreateQuest } from './utils'
import { CreateQuest } from './types'
import { colors } from '../../components/log'
import { CliError } from '../../logic/error'
import { LinkerdAppOptions } from '../../linker-dapp/api'

interface Options {
  args: Result<typeof args>
  components: CliComponents
}

export const args = declareArgs({
  '--help': Boolean,
  '-h': '--help',
  '--no-browser': Boolean,
  '-b': '--no-browser',
  '--port': Number,
  '-p': '--port',
  '--https': Boolean,
  '--target': String,
  '-t': '--target',
  '--list': String,
  '-l': '--list',
  '--create': Boolean,
  '--create-from-json': String,
  '--deactivate': String,
  '--activate': String
})

export function help(options: Options) {
  options.components.logger.log(`
    Usage: 'sdk-commands quests [options]'
      Options:
        -h,  --help                                                   Displays complete help
        --create                                                      Creates a new Quest by prompts
        --create-from-json   [path]                                   Create a new Quest from absolute path to a JSON file
        -l, --list           [your_eth_address]                       Lists all of your quests. 
        --deactivate         [quest_id]                               Deactivate a Quest that you created
        --activate           [quest_id]                               Activate your Quest that was deactivated
        -p, --port           [port]                                   Select a custom port for the development server
        -b, --no-browser                                              Do not open a new browser window
        -t, --target         [URL]                                    Specifies the target Quests server. Defaults to https://quests.decentraland.org


      Example:
      - Creates a new Quest:
        $ sdk-commands quests --create
      - Creates a new Quest from a JSON file:
        $ sdk-commands quests --create-from-a-json /Users/nickname/Desktop/my-great-quest.json
      - List your Quests:
        $ sdk-commands quests -l 0xYourAddress
        $ sdk-commands quests --list 0xYourAddress
      - Deactivate a Quest:
        $ sdk-commands quests --deactivate 0001-your-quest-id-2222
      - Activate a Quest:
        $ sdk-commands quests --activate 0001-your-quest-id-2222
  `)
}

export async function main(options: Options) {
  const linkerPort = options.args['--port']
  const openBrowser = !options.args['--no-browser']
  const isHttps = !!options.args['--https']
  const linkerOpts = { linkerPort, openBrowser, isHttps }

  const { logger } = options.components

  if (options.args['--target']) {
    if (!new RegExp(urlRegex).test(options.args['--target']) && !options.args['--target'].includes('localhost')) {
      throw new CliError('The provided target is not a valid URL')
    }
  }
  const baseURL = options.args['--target'] || 'https://quests.decentraland.org'

  logger.info(`You're using ${baseURL} server`)

  if (options.args['--create']) {
    await executeCreateSubcommand(options.components, linkerOpts, baseURL)
  } else if (options.args['--create-from-json'] && options.args['--create-from-json'].length) {
    await executeCreateSubcommand(options.components, linkerOpts, baseURL, options.args[`--create-from-json`])
  } else if (options.args['--list']?.length) {
    await executeListSubcommand(options.components, linkerOpts, baseURL, options.args['--list'])
  } else if (options.args['--activate']?.length) {
    await executeActivateSubcommand(options.components, linkerOpts, baseURL, options.args['--activate'])
  } else if (options.args['--deactivate']?.length) {
    await executeDeactivateSubcommand(options.components, linkerOpts, baseURL, options.args['--deactivate'])
  }
}

async function executeCreateSubcommand(
  components: CliComponents,
  linkerOpts: Omit<LinkerdAppOptions, 'uri'>,
  baseURL: string,
  path?: string
) {
  const { logger, fs } = components
  let quest: CreateQuest | null = null
  if (path) {
    if (await fs.fileExists(path)) {
      const createQuestJson = await fs.readFile(path, { encoding: 'utf-8' })
      try {
        quest = JSON.parse(createQuestJson) as CreateQuest
      } catch (error) {
        throw new CliError(`${path} doesn't contain a valid JSON`)
      }

      if (!validateCreateQuest(quest, { logger })) {
        throw new CliError('You provided an invalid Quest JSON. Please check the documentation')
      }
    } else {
      throw new CliError("File doesn't exist")
    }
  } else {
    quest = await createQuestByPrompting({ logger })
    if (!quest) {
      throw new CliError('Quest creation was cancelled')
    }
  }

  const createURL = `${baseURL}/api/quests`

  await executeSubcommand(
    components,
    linkerOpts,
    {
      url: createURL,
      method: 'POST',
      metadata: quest,
      actionType: 'create',
      extraData: { questName: quest.name, createQuest: quest }
    },
    async (authchainHeaders) => {
      try {
        const res = await fetch(createURL, {
          method: 'POST',
          headers: {
            ...authchainHeaders,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(quest)
        })
        const questsId: { id: string } = await res.json()
        logger.log(' ')
        logger.log(
          `${colors.greenBright(`> Your Quest: ${quest!.name} was created successfully - ID:`)} ${questsId.id}`
        )
        logger.log(' ')
      } catch (error) {
        logger.error('> Error returned by Quests Server: ', error as any)
      }
    }
  )
}

async function executeListSubcommand(
  components: CliComponents,
  linkerOpts: Omit<LinkerdAppOptions, 'uri'>,
  baseURL: string,
  address: string
) {
  const { logger } = components

  const getQuests = `${baseURL}/api/creators/${address}/quests`

  if (!isAddress(address)) {
    throw new CliError('You should provide a valid EVM address')
  }

  await executeSubcommand(
    components,
    linkerOpts,
    { url: getQuests, method: 'GET', metadata: {}, actionType: 'list' },
    async (authchainHeaders) => {
      try {
        const res = await fetch(getQuests, {
          method: 'GET',
          headers: {
            ...authchainHeaders,
            'Content-Type': 'application/json'
          }
        })
        const { quests }: { quests: { id: string; name: string }[] } = await res.json()
        logger.log(' ')
        logger.log(colors.greenBright("Your request has been processed successfully. Your Quests' list is below: "))
        quests.forEach((quest) => {
          logger.log(' ')
          logger.log(`${colors.greenBright('ID: ')} ${quest.id} - ${colors.greenBright('Name: ')} ${quest.name}`)
        })
        logger.log(' ')
      } catch (error) {
        logger.error('> Error returned by Quests Server: ', error as any)
      }
    }
  )
}

async function executeActivateSubcommand(
  components: CliComponents,
  linkerOpts: Omit<LinkerdAppOptions, 'uri'>,
  baseURL: string,
  questId: string
) {
  const { logger } = components

  const activateQuest = `${baseURL}/api/quests/${questId}/activate`

  if (!validate(questId)) {
    throw new CliError('You should provide a valid uuid')
  }

  await executeSubcommand(
    components,
    linkerOpts,
    { url: activateQuest, method: 'PUT', metadata: {}, actionType: 'activate', extraData: { questId } },
    async (authchainHeaders) => {
      try {
        const res = await fetch(activateQuest, {
          method: 'PUT',
          headers: {
            ...authchainHeaders,
            'Content-Type': 'application/json'
          }
        })
        if (res.status === 202) {
          logger.log(' ')
          logger.log(colors.greenBright('Your Quest is active again!'))
        }
        logger.log(' ')
      } catch (error) {
        logger.error('> Error returned by Quests Server: ', error as any)
      }
    }
  )
}

async function executeDeactivateSubcommand(
  components: CliComponents,
  linkerOpts: Omit<LinkerdAppOptions, 'uri'>,
  baseURL: string,
  questId: string
) {
  const { logger } = components

  const deactivateQuest = `${baseURL}/api/quests/${questId}`

  if (!validate(questId)) {
    throw new CliError('You should provide a valid uuid')
  }

  await executeSubcommand(
    components,
    linkerOpts,
    { url: deactivateQuest, method: 'DELETE', metadata: {}, actionType: 'deactivate', extraData: { questId } },
    async (authchainHeaders) => {
      try {
        const res = await fetch(deactivateQuest, {
          method: 'DELETE',
          headers: {
            ...authchainHeaders,
            'Content-Type': 'application/json'
          }
        })
        if (res.status === 202) {
          logger.log(' ')
          logger.log(colors.yellowBright('Your Quest was deactivated'))
        }
        logger.log(' ')
      } catch (error) {
        logger.error('> Error returned by Quests Server: ', error as any)
      }
    }
  )
}
