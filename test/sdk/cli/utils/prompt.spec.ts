jest.mock('../../../../packages/@dcl/sdk/node_modules/inquirer')

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as inquirer from '../../../../packages/@dcl/sdk/node_modules/inquirer'
import * as promptUtils from '../../../../packages/@dcl/sdk/cli/utils/prompt'

afterEach(() => {
  jest.clearAllMocks()
  jest.restoreAllMocks()
})

describe('utils/prompt', () => {
  it('confirm: should return answer', async () => {
    const promptSpy = jest
      .spyOn(inquirer, 'prompt')
      .mockResolvedValue({ answer: true })

    const res = await promptUtils.confirm('some message')

    expect(res).toBe(true)
    expect(promptSpy).toBeCalledWith({
      name: 'answer',
      message: 'some message',
      type: 'confirm'
    })
  })
})
