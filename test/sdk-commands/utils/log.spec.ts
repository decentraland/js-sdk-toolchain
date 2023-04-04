import { createStderrCliLogger } from '../../../packages/@dcl/sdk-commands/src/components/log'
import * as bl from '../../../packages/@dcl/sdk-commands/src/logic/beautiful-logs'
import * as p from '../../../packages/@dcl/sdk-commands/src/logic/project-validations'

describe('utils/log', () => {
  it('Call the log functions to test everything works', () => {
    const logs = createStderrCliLogger()
    logs.log('raw raw', { extraData: 1 })
    logs.error('fail fail', { extraData: 1 })
    logs.info('info info', { extraData: 1 })
    logs.debug('succeed succeed', { extraData: 1 })
    logs.warn('warn warn', { extraData: 1 })
    logs.log('raw raw')
    logs.error('fail fail')
    logs.info('info info')
    logs.debug('succeed succeed')
    logs.warn('warn warn')
  })

  test('beautiful logs?', () => {
    const logs = createStderrCliLogger()
    bl.printCommand(logs, 'command')
    bl.printProgressInfo(logs, 'info')
    bl.printProgressStep(logs, 'step', 1, 3)
    bl.printWarning(logs, 'a beautiful warning')
    const project: p.SceneProject = { scene: {} as any, kind: 'scene', workingDirectory: process.cwd() }
    bl.printCurrentProjectStarting(logs, project, { projects: [project], rootWorkingDirectory: process.cwd() })
    bl.printCurrentProjectStarting(logs, project, { projects: [project, project], rootWorkingDirectory: process.cwd() })
    bl.printSuccess(logs, 'step', 'asd')
  })
})
