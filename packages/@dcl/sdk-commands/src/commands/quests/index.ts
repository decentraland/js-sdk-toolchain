import { Result } from 'arg'
import prompts from 'prompts'
import fetch from 'node-fetch'
import { declareArgs } from '../../logic/args'
import { CliComponents } from '../../components'
import { createQuest, executeSubcommand, validateCreateQuest } from './utils'
import { CreateQuest } from './types'
import { colors } from '../../components/log'

interface Options {
  args: Result<typeof args>
  components: CliComponents
}

export const args = declareArgs({
  '--help': Boolean,
  '-h': '--help',
  '--list': String,
  '-ls': '--list',
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
        --create                                                      Creates a new Quest
        --create-from-json   [path]                                   Create a new Quest from absolute path to a JSON file
        -ls, --list          [your_eth_address]                       Lists all of your quests
        --deactivate         [quest_id]                               Deactivate your Quest
        --activate           [quest_id]                               Activate your Quest that was deactivated

  
      Example:
      - Lists all of your quests:
        $ sdk-commands quests --list
      - Creates a new Quest:
        $ sdk-commands quests --create
  `)
}

export async function main(options: Options) {
  const { logger } = options.components

  const { environment } = await prompts({
    type: 'select',
    name: 'environment',
    message: 'Do you want to use development or production environment?',
    choices: [{ title: 'dev' }, { title: 'prd' }]
  })

  const env = environment === 0 ? 'dev' : environment === 1 ? 'prd' : 'local'

  logger.info(`> You're using ${env} environment`)

  const baseURL =
    env === 'dev'
      ? 'https://quests.decentraland.zone'
      : env === 'prd'
      ? 'https://quests.decentraland.org'
      : 'http://localhost:3000'

  if (options.args['--create']) {
    await executeCreateSubcommand(options.components, baseURL)
  } else if (options.args['--create-from-json'] && options.args['--create-from-json'].length) {
    await executeCreateSubcommand(options.components, baseURL, options.args[`--create-from-json`])
  } else if (options.args['--list']?.length) {
    await executeListSubcommand(options.components, baseURL, options.args['--list'])
  } else if (options.args['--activate']?.length) {
    await executeActivateSubcommand(options.components, baseURL, options.args['--activate'])
  } else if (options.args['--deactivate']?.length) {
    await executeDeactivateSubcommand(options.components, baseURL, options.args['--deactivate'])
  }
}

async function executeCreateSubcommand(components: CliComponents, baseURL: string, path?: string) {
  const { logger, fs } = components
  let quest: CreateQuest | null = null
  if (path) {
    if (await fs.fileExists(path)) {
      const createQuestJson = await fs.readFile(path, { encoding: 'utf-8' })
      try {
        quest = JSON.parse(createQuestJson) as CreateQuest
        logger.info('> Quest: ', quest as unknown as any)
        if (!validateCreateQuest(quest, { logger })) return
      } catch (error) {
        logger.error(`> ${path} doesn't contain a valid JSON`)
      }
    } else {
      logger.error("> File doesn't exist")
      return
    }
  } else {
    quest = await createQuest({ logger })
  }

  if (!quest) {
    logger.error('> Quest creation was cancelled')
    return
  }

  const createURL = `${baseURL}/api/quests`

  await executeSubcommand(
    components,
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
        logger.log(`${colors.greenBright(`> Your Quest: ${quest!.name} was created successfully - ID:`)} ${questsId}`)
        logger.log(' ')
      } catch (error) {
        logger.error('> Error returned by Quests Server: ', error as any)
      }
    }
  )
}

async function executeListSubcommand(components: CliComponents, baseURL: string, address: string) {
  const { logger } = components

  const getQuests = `${baseURL}/api/creators/${address}/quests`

  await executeSubcommand(
    components,
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

async function executeActivateSubcommand(components: CliComponents, baseURL: string, questId: string) {
  const { logger } = components

  const activateQuest = `${baseURL}/api/quests/${questId}/activate`

  await executeSubcommand(
    components,
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

async function executeDeactivateSubcommand(components: CliComponents, baseURL: string, questId: string) {
  const { logger } = components

  const deactivateQuest = `${baseURL}/api/quests/${questId}`

  await executeSubcommand(
    components,
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
