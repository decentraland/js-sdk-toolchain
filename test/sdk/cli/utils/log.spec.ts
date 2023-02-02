import * as logUtils from '../../../../packages/@dcl/sdk/cli/utils/log'

describe('utils/log', () => {
  it('raw: it should call console.log', () => {
    const spy = jest.spyOn(console, 'log')
    logUtils.raw('test')
    expect(spy).toBeCalledWith('test')
  })

  it('fail: it should call console.log', () => {
    const spy = jest.spyOn(console, 'log')
    logUtils.fail('test')
    expect(spy).toBeCalledWith('🔴 test')
  })

  it('warn: it should call console.log', () => {
    const spy = jest.spyOn(console, 'log')
    logUtils.warn('test')
    expect(spy).toBeCalledWith('🟠 test')
  })

  it('info: it should call console.log', () => {
    const spy = jest.spyOn(console, 'log')
    logUtils.info('test')
    expect(spy).toBeCalledWith('🔵 test')
  })

  it('succeed: it should call console.log', () => {
    const spy = jest.spyOn(console, 'log')
    logUtils.succeed('test')
    expect(spy).toBeCalledWith('🟢 test')
  })
})
