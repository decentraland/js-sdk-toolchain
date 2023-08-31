import { Result } from 'arg'
import prompts from 'prompts'
import { declareArgs } from '../../logic/args'
import { CliComponents } from '../../components'
import future from 'fp-future'
import { createAuthchainHeaders, createQuest, getAddressAndSignature } from './utils'
import fetch from 'node-fetch'

interface Options {
  args: Result<typeof args>
  components: CliComponents
}

export const args = declareArgs({
  '--help': Boolean,
  '-h': '--help',
  '--list': Boolean,
  '-ls': '--list',
  '--create': Boolean
})

export function help(options: Options) {
  options.components.logger.log(`
    Usage: 'sdk-commands quests [options]'
      Options:
        -h,  --help          Displays complete help
        -ls, --list          Lists all of your quests
        --create             Creates a new Quest
        --create-from-json   Create a new Quest from absolute path to JSON file
  
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
  }
}

async function executeCreateSubcommand(components: CliComponents, baseURL: string) {
  const { logger } = components
  const promptedQuest = await createQuest({ logger })
  if (!promptedQuest) {
    logger.error('Quest creation was cancelled')
    return
  }

  const awaitResponse = future<void>()

  const timestamp = String(Date.now())

  const createURL = `${baseURL}/api/quests`
  const pathname = new URL(createURL).pathname
  const method = 'POST'
  const metadata = JSON.stringify(promptedQuest)
  const payload = [method, pathname, timestamp, metadata].join(':').toLowerCase()

  const { program } = await getAddressAndSignature(
    components,
    awaitResponse,
    payload,
    {
      isHttps: false,
      openBrowser: false,
      linkerPort: 3003
    },
    async (linkerResponse) => {
      const { chainId, ...rest } = linkerResponse
      try {
        const res = await fetch(createURL, {
          method: 'POST',
          headers: {
            ...createAuthchainHeaders(rest.address, rest.signature, payload, timestamp, metadata),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(promptedQuest)
        })
        const questsId: { id: string } = await res.json()
        logger.info(`> Your Quest: ${promptedQuest.name} was created successfully - ID: `, questsId)
      } catch (error) {
        logger.error('> Error returned by Quests Server: ', error as any)
      }
    }
  )

  try {
    await awaitResponse
  } finally {
    void program?.stop()
  }
}
