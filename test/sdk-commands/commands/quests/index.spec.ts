import { resolve } from 'path'
import * as quests from '../../../../packages/@dcl/sdk-commands/src/commands/quests/index'
import * as utils from '../../../../packages/@dcl/sdk-commands/src/commands/quests/utils'
import { initComponents } from '../../../../packages/@dcl/sdk-commands/src/components'

describe('quests command', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('should throw if target parameter is not a valid URL', async () => {
    const components = await initComponents()

    await expect(() => quests.main({ args: { _: [], '--target': 'aaa' }, components })).rejects.toThrow(
      'The provided target is not a valid URL'
    )

    await expect(() => quests.main({ args: { _: [], '--target': 'aaa.com' }, components })).rejects.toThrow(
      'The provided target is not a valid URL'
    )
  })

  it('should NOT throw if target parameter is a valid URL', async () => {
    const components = await initComponents()

    await expect(quests.main({ args: { _: [], '--target': 'http://aaa.com' }, components })).resolves.not.toThrow()
  })

  describe('--create-from-json', () => {
    it('should throw if the file doesnt exist', async () => {
      const components = await initComponents()
      const existSpy = jest.spyOn(components.fs, 'fileExists')
      const executeSubcommand = jest.spyOn(utils, 'executeSubcommand')

      await expect(() => quests.main({ args: { _: [], '--create-from-json': 'null' }, components })).rejects.toThrow(
        "File doesn't exist"
      )
      expect(existSpy).toBeCalled()
      expect(executeSubcommand).not.toBeCalled()
    })

    it('should throw if provided Quest is invalid', async () => {
      const components = await initComponents()
      const executeSubcommand = jest.spyOn(utils, 'executeSubcommand')
      const path = resolve('./test/sdk-commands/commands/quests/invalid_quest.json')

      await expect(() => quests.main({ args: { _: [], '--create-from-json': path }, components })).rejects.toThrow(
        'You provided an invalid Quest JSON. Please check the documentation'
      )
      expect(executeSubcommand).not.toBeCalled()
    })

    it('should throw if provided file does not contain a JSON', async () => {
      const components = await initComponents()
      const executeSubcommand = jest.spyOn(utils, 'executeSubcommand')
      const path = resolve('./test/sdk-commands/commands/quests/not_valid_json')

      await expect(() => quests.main({ args: { _: [], '--create-from-json': path }, components })).rejects.toThrow(
        `${path} doesn't contain a valid JSON`
      )
      expect(executeSubcommand).not.toBeCalled()
    })

    it('should be executed properly when Quest is valid', async () => {
      const components = await initComponents()
      const executeSubcommand = jest.spyOn(utils, 'executeSubcommand').mockResolvedValueOnce()
      const path = resolve('./test/sdk-commands/commands/quests/valid_quest.json')

      const createQuestJson = JSON.parse(await components.fs.readFile(path, { encoding: 'utf-8' }))

      await quests.main({ args: { _: [], '--create-from-json': path }, components })

      expect(executeSubcommand).toBeCalledWith(
        components,
        { linkerPort: undefined, isHttps: false, openBrowser: true },
        {
          url: 'https://quests.decentraland.org/api/quests',
          method: 'POST',
          metadata: createQuestJson,
          actionType: 'create',
          extraData: { questName: createQuestJson.name, createQuest: createQuestJson }
        },
        expect.any(Function)
      )
    })
  })

  describe('--create', () => {
    it('should throw if SIGNTERM while prompting', async () => {
      const components = await initComponents()
      const existSpy = jest.spyOn(components.fs, 'fileExists')
      const createMock = jest.spyOn(utils, 'createQuestByPrompting').mockResolvedValueOnce(null)
      const executeSubcommand = jest.spyOn(utils, 'executeSubcommand')

      await expect(() => quests.main({ args: { _: [], '--create': true }, components })).rejects.toThrow(
        'Quest creation was cancelled'
      )
      expect(existSpy).not.toBeCalled()
      expect(createMock).toBeCalledWith({ logger: components.logger })
      expect(executeSubcommand).not.toBeCalled()
    })

    it('should be executed properly when users prompts correctly', async () => {
      const components = await initComponents()
      const existSpy = jest.spyOn(components.fs, 'fileExists')
      const executeSubcommand = jest.spyOn(utils, 'executeSubcommand').mockResolvedValueOnce()

      const quest = JSON.parse(
        await components.fs.readFile(resolve('./test/sdk-commands/commands/quests/valid_quest.json'), {
          encoding: 'utf-8'
        })
      )
      const createMock = jest.spyOn(utils, 'createQuestByPrompting').mockResolvedValueOnce(quest)

      await quests.main({ args: { _: [], '--create': true }, components })

      expect(existSpy).not.toBeCalled()
      expect(createMock).toBeCalledWith({ logger: components.logger })
      expect(executeSubcommand).toBeCalledWith(
        components,
        { linkerPort: undefined, isHttps: false, openBrowser: true },
        {
          url: 'https://quests.decentraland.org/api/quests',
          method: 'POST',
          metadata: quest,
          actionType: 'create',
          extraData: { questName: quest.name, createQuest: quest }
        },
        expect.any(Function)
      )
    })
  })

  describe('--list & -l', () => {
    it('should be executed properly', async () => {
      const components = await initComponents()
      const executeSubcommand = jest.spyOn(utils, 'executeSubcommand').mockResolvedValueOnce()

      await quests.main({ args: { _: [], '--list': '0xc0ffee254729296a45a3885639AC7E10F9d54979' }, components })

      expect(executeSubcommand).toBeCalledWith(
        components,
        { linkerPort: undefined, isHttps: false, openBrowser: true },
        {
          url: 'https://quests.decentraland.org/api/creators/0xc0ffee254729296a45a3885639AC7E10F9d54979/quests',
          method: 'GET',
          metadata: {},
          actionType: 'list'
        },
        expect.any(Function)
      )
    })

    it('should throw if provided EVM address is not valid', async () => {
      const components = await initComponents()
      const executeSubcommand = jest.spyOn(utils, 'executeSubcommand')

      await expect(() => quests.main({ args: { _: [], '--list': '0xA' }, components })).rejects.toThrow(
        'You should provide a valid EVM address'
      )
      expect(executeSubcommand).not.toBeCalled()
    })
  })

  describe('--activate', () => {
    it('should be executed properly', async () => {
      const components = await initComponents()
      const executeSubcommand = jest.spyOn(utils, 'executeSubcommand').mockResolvedValueOnce()

      await quests.main({ args: { _: [], '--activate': '342adfeb-535f-4adb-9d78-975f732808b2' }, components })

      expect(executeSubcommand).toBeCalledWith(
        components,
        { linkerPort: undefined, isHttps: false, openBrowser: true },
        {
          url: 'https://quests.decentraland.org/api/quests/342adfeb-535f-4adb-9d78-975f732808b2/activate',
          method: 'PUT',
          metadata: {},
          actionType: 'activate',
          extraData: {
            questId: '342adfeb-535f-4adb-9d78-975f732808b2'
          }
        },
        expect.any(Function)
      )
    })

    it('should throw if provided Quest ID is not a valid UUID', async () => {
      const components = await initComponents()
      const executeSubcommand = jest.spyOn(utils, 'executeSubcommand')

      await expect(() =>
        quests.main({ args: { _: [], '--activate': '342adfeb-535f-4adb-9d78-975f7' }, components })
      ).rejects.toThrow('You should provide a valid uuid')
      expect(executeSubcommand).not.toBeCalled()
    })
  })

  describe('--deactivate', () => {
    it('should be executed properly', async () => {
      const components = await initComponents()
      const executeSubcommand = jest.spyOn(utils, 'executeSubcommand').mockResolvedValueOnce()

      await quests.main({ args: { _: [], '--deactivate': '342adfeb-535f-4adb-9d78-975f732808b2' }, components })

      expect(executeSubcommand).toBeCalledWith(
        components,
        { linkerPort: undefined, isHttps: false, openBrowser: true },
        {
          url: 'https://quests.decentraland.org/api/quests/342adfeb-535f-4adb-9d78-975f732808b2',
          method: 'DELETE',
          metadata: {},
          actionType: 'deactivate',
          extraData: {
            questId: '342adfeb-535f-4adb-9d78-975f732808b2'
          }
        },
        expect.any(Function)
      )
    })

    it('should throw if provided Quest ID is not a valid UUID', async () => {
      const components = await initComponents()
      const executeSubcommand = jest.spyOn(utils, 'executeSubcommand')

      await expect(() =>
        quests.main({ args: { _: [], '--deactivate': '342adfeb-535f-4adb-9d78-975f' }, components })
      ).rejects.toThrow('You should provide a valid uuid')
      expect(executeSubcommand).not.toBeCalled()
    })
  })
})
