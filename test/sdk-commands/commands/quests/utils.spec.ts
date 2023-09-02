import { resolve } from 'path'
import * as utils from '../../../../packages/@dcl/sdk-commands/src/commands/quests/utils'
import { CliComponents, initComponents } from '../../../../packages/@dcl/sdk-commands/src/components'
import { CreateQuest } from '../../../../packages/@dcl/sdk-commands/src/commands/quests/types'

describe('quests utils', () => {
  describe('validateCreateQuest', () => {
    let components: CliComponents
    let quest: CreateQuest
    beforeAll(async () => {
      components = await initComponents()
      const path = resolve('./test/sdk-commands/commands/quests/valid_quest.json')
      quest = JSON.parse(await components.fs.readFile(path, { encoding: 'utf-8' }))
    })

    it('should be true', () => {
      expect(utils.validateCreateQuest(quest, { logger: components.logger })).toBeTruthy()
    })

    it('should be false if name is less than 5 chars', () => {
      const q = { ...quest }
      q.name = 'aa'
      expect(utils.validateCreateQuest(q, { logger: components.logger })).toBeFalsy()
    })

    it('should be false if description is less than 5 chars', () => {
      const q = { ...quest }
      q.description = 'aaa'
      expect(utils.validateCreateQuest(q, { logger: components.logger })).toBeFalsy()
    })

    it('should be false if quest does not have image', () => {
      const q = { ...quest }
      const { imageUrl, ...rest } = q
      expect(utils.validateCreateQuest(rest as CreateQuest, { logger: components.logger })).toBeFalsy()
    })

    it('should be false if image is not an URL', () => {
      const q = { ...quest }
      q.imageUrl = 'noturl'
      expect(utils.validateCreateQuest(q, { logger: components.logger })).toBeFalsy()
    })

    it('should be true if quest does not have a reward', () => {
      const q = { ...quest }
      const { reward, ...rest } = q
      expect(utils.validateCreateQuest(rest, { logger: components.logger })).toBeTruthy()
    })

    it('should be false if quest has a reward but missing hook', () => {
      const q = { ...quest, reward: { ...quest.reward } } as any
      if (q.reward) {
        q.reward.hook = undefined
      }
      expect(utils.validateCreateQuest(q, { logger: components.logger })).toBeFalsy()
    })

    it('should be false if webhook URL is invalid', () => {
      const q = { ...quest, reward: { hook: { ...quest.reward?.hook }, items: [...(quest.reward?.items || [])] } }
      if (q.reward?.hook?.webhookUrl) {
        q.reward.hook.webhookUrl = 'aaa'
      }
      expect(utils.validateCreateQuest(q as CreateQuest, { logger: components.logger })).toBeFalsy()
    })

    it('should be false if there is not a webhook URL', () => {
      const q = {
        ...quest,
        reward: { ...quest.reward, hook: { requestBody: { beneficiary: '{user_address}' } } }
      } as any
      expect(utils.validateCreateQuest(q, { logger: components.logger })).toBeFalsy()
    })

    it('should be false if items are not defined', () => {
      const q = { ...quest, reward: { hook: { ...quest.reward?.hook }, items: [...(quest.reward?.items || [])] } }
      if (q.reward.items) {
        q.reward.items = undefined as any
      }
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()
    })

    it('should be false if items not an array', () => {
      const q = { ...quest, reward: { hook: { ...quest.reward?.hook }, items: [...(quest.reward?.items || [])] } }
      if (q.reward.items) {
        q.reward.items = '' as any
      }
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()
    })

    it('should be false if items are 0', () => {
      const q = { ...quest, reward: { hook: { ...quest.reward?.hook }, items: [...(quest.reward?.items || [])] } }
      if (q.reward.items) {
        q.reward.items = []
      }
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()
    })

    it('should be false if items does not have a valid image or valid name', () => {
      const q = { ...quest, reward: { hook: { ...quest.reward?.hook }, items: [...(quest.reward?.items || [])] } }
      if (q.reward.items) {
        q.reward.items = [{ name: 'sunglasses' }] as any
      }
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      if (q.reward.items) {
        q.reward.items = [{ imageLink: 'sunglasses' }] as any
      }
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      if (q.reward.items) {
        q.reward.items = [{ imageLink: 'https://a.com', name: 'a' }] as any
      }
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()
    })

    it('should be false if it does not have a valid definition', () => {
      const q = { ...quest, reward: { hook: { ...quest.reward?.hook }, items: [...(quest.reward?.items || [])] } }
      q.definition = undefined as any
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.connections = []
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.connections = 'aaa' as any
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.connections[0].stepFrom = undefined as any
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.steps = []
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.steps = 'aaa' as any
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.steps[0].description = ''
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.steps[0].id = ''
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.steps[0].tasks[0].description = ''
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.steps[0].tasks[0].id = ''
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.steps[0].tasks[0].actionItems[0].type = 'BLAAAAA'
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.steps[0].tasks[0].actionItems[0].parameters = undefined as any
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.steps[0].tasks[0].actionItems[0].parameters = {}
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.steps[0].tasks[0].actionItems = []
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()

      q.definition = { connections: { ...quest.definition.connections }, steps: { ...quest.definition.steps } }
      q.definition.steps[0].tasks = []
      expect(utils.validateCreateQuest(q as any, { logger: components.logger })).toBeFalsy()
    })
  })
})
