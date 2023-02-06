import * as logUtils from '../../../../packages/@dcl/sdk/cli/utils/log'

describe('utils/log', () => {
  it('Call the log functions to test everything works', () => {
    logUtils.log('raw raw')
    logUtils.fail('fail fail')
    logUtils.info('info info')
    logUtils.succeed('succeed succeed')
    logUtils.warn('warn warn')
  })
})
