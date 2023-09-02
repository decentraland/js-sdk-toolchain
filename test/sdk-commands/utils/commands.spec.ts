import { CliError } from '../../../packages/@dcl/sdk-commands/src/logic/error'
import * as commands from '../../../packages/@dcl/sdk-commands/src/logic/commands'
import { initComponents } from '../../../packages/@dcl/sdk-commands/src/components'
import { runSdkCommand } from '../../../packages/@dcl/sdk-commands/src/run-command'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('utils/commands', () => {
  it('should not throw if command exists', async () => {
    const components = await initComponents()

    const result = await commands.getCommands(components)

    expect(result).toContain('build')
    expect(result).toContain('deploy')
    expect(result).toContain('export-static')
    expect(result).toContain('init')
    expect(result).toContain('start')
    expect(result).toContain('quests')
  })

  it('should throw if command does not have an "index"', async () => {
    const components = await initComponents()
    const readDirSpy = jest.spyOn(components.fs, 'readdir').mockResolvedValue(['unexistent-command'] as any)

    await expect(commands.getCommands(components)).rejects.toThrow(CliError)

    expect(readDirSpy).toHaveBeenCalled()
  })

  test('runs a help command', async () => {
    const components = await initComponents()

    await runSdkCommand(components, 'help', ['--help'])
  })

  it('runs a help command over all commands', async () => {
    const components = await initComponents()

    const result = await commands.getCommands(components)

    for (const command of result) {
      try {
        await runSdkCommand(components, command, ['--help'])
      } catch (e: any) {
        console.dir(e)
        console.error(e)
        throw e
      }
    }
  })
})
