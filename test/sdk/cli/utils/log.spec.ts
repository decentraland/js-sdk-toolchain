import { createStdoutCliLogger } from '../../../../packages/@dcl/sdk/cli/components/log'

describe('utils/log', () => {
  it('Call the log functions to test everything works', () => {
    const logs = createStdoutCliLogger()
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
})
