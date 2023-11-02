import { Result } from 'arg'
import { isAddress } from 'eth-connect'
import { validate } from 'uuid'
import { validateCreateQuest } from '@dcl/quests-client/dist-cjs/utils'

import { declareArgs } from '../../logic/args'
import { CliComponents } from '../../components'
import { createQuestByPrompting, executeSubcommand, setUpManager, urlRegex } from './utils'
import { CreateQuest } from './types'
import { colors } from '../../components/log'
import { CliError } from '../../logic/error'
import { dAppOptions, runDapp } from '../../run-dapp'
import { printError, printSuccess } from '../../logic/beautiful-logs'

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
  '--activate': String,
  '--manager': Boolean,
  '-m': '--manager'
})

export function help(options: Options) {
  options.components.logger.log(`
    Usage: 'sdk-commands quests [options]'
      Options:
        -h,  --help                                                   Displays complete help
        -m, --manager                                                 Open up Quests Manager
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
  } else if (options.args['--manager']) {
    await executeManagerSubcommand(options.components, linkerOpts, baseURL)
  }
}

async function executeCreateSubcommand(
  components: CliComponents,
  linkerOpts: Omit<dAppOptions, 'uri'>,
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

      try {
        validateCreateQuest(quest)
      } catch (error) {
        logger.error(error as Error)
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
      const res = await components.fetch.fetch(createURL, {
        method: 'POST',
        headers: {
          ...authchainHeaders,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(quest)
      })
      if (res.status === 201) {
        const { id: questId } = (await res.json()) as { id: string }
        components.analytics.track('Quest Created Success', { questId, questName: quest!.name })
        printSuccess(logger, `> Your Quest: ${quest!.name} was created successfully - ID: ${questId}`, '')
      } else {
        const { code, message } = (await res.json()) as { code: number; message: string }
        components.analytics.track('Quest Created Failure', { code })
        printError(
          logger,
          `> Error returned by Quests Server: `,
          new Error(`Status Code: ${code} - Message: "${message}"`)
        )
      }
    }
  )
}

async function executeListSubcommand(
  components: CliComponents,
  linkerOpts: Omit<dAppOptions, 'uri'>,
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
      const res = await components.fetch.fetch(getQuests, {
        method: 'GET',
        headers: {
          ...authchainHeaders,
          'Content-Type': 'application/json'
        }
      })
      if (res.status === 200) {
        const { quests } = (await res.json()) as { quests: { id: string; name: string }[] }
        if (quests.length) {
          printSuccess(logger, "Your request has been processed successfully. The Quests' list is below: ", '')
          quests.forEach((quest) => {
            logger.log(' ')
            logger.log(`${colors.greenBright('ID: ')} ${quest.id} - ${colors.greenBright('Name: ')} ${quest.name}`)
          })
          logger.log(' ')
        } else {
          printSuccess(logger, `No Quest was created by ${address}`, '')
        }
        components.analytics.track('Quest List Success', { creatorAddress: address })
      } else {
        const { code, message } = (await res.json()) as { code: number; message: string }
        components.analytics.track('Quest List Failure', { code, creatorAddress: address })
        printError(
          logger,
          `> Error returned by Quests Server: `,
          new Error(`Status Code: ${code} - Message: "${message}"`)
        )
      }
    }
  )
}

async function executeActivateSubcommand(
  components: CliComponents,
  linkerOpts: Omit<dAppOptions, 'uri'>,
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
      const res = await components.fetch.fetch(activateQuest, {
        method: 'PUT',
        headers: {
          ...authchainHeaders,
          'Content-Type': 'application/json'
        }
      })
      if (res.status === 202) {
        components.analytics.track('Quest Activated Success', { questId })
        printSuccess(logger, 'Your Quest is active again!', '')
      } else {
        const { code, message } = (await res.json()) as { code: number; message: string }
        components.analytics.track('Quest Activated Failure', { questId, code })
        printError(
          logger,
          `> Error returned by Quests Server: `,
          new Error(`Status Code: ${code} - Message: "${message}"`)
        )
      }
    }
  )
}

async function executeDeactivateSubcommand(
  components: CliComponents,
  linkerOpts: Omit<dAppOptions, 'uri'>,
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
      const res = await components.fetch.fetch(deactivateQuest, {
        method: 'DELETE',
        headers: {
          ...authchainHeaders,
          'Content-Type': 'application/json'
        }
      })

      if (res.status === 202) {
        components.analytics.track('Quest Deactivated Success', { questId })
        printSuccess(logger, 'Your Quest was deactivated', '')
      } else {
        const { code, message } = (await res.json()) as { code: number; message: string }
        components.analytics.track('Quest Deactivated Failure', { questId, code })
        printError(
          logger,
          `> Error returned by Quests Server: `,
          new Error(`Status Code: ${code} - Message: "${message}"`)
        )
      }
    }
  )
}

async function executeManagerSubcommand(
  components: CliComponents,
  linkerOpts: Omit<dAppOptions, 'uri'>,
  baseUrl: string
) {
  const { router } = setUpManager(components)

  let env: 'dev' | 'prod' | ''
  if (baseUrl.includes('quests.decentraland.org')) {
    env = 'prod'
  } else if (baseUrl.includes('quests.decentraland.zone')) {
    env = 'dev'
  } else {
    env = ''
  }

  components.logger.info('Opening up the Quests Manager:')
  const { program } = await runDapp(components, router, { ...linkerOpts, uri: `/?env=${env}` })

  const p = new Promise((resolve) => {
    process.on('SIGINT', async function () {
      void program.stop()
      resolve(true)
    })
  })

  await p
}
