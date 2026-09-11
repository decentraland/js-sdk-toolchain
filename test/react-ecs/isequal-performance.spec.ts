import { isEqual } from '../../packages/@dcl/react-ecs/src/reconciler/utils'

describe('when comparing equivalent nested React ECS props', () => {
  let stringifySpy: jest.SpyInstance
  let result: boolean

  beforeEach(() => {
    stringifySpy = jest.spyOn(JSON, 'stringify')
    result = isEqual(
      { dimensions: { width: 100, height: 50 }, colors: ['red', 'blue'] },
      { colors: ['red', 'blue'], dimensions: { height: 50, width: 100 } }
    )
  })

  afterEach(() => {
    stringifySpy.mockRestore()
  })

  it('should compare recursively without serializing the prop trees', () => {
    expect(result).toBe(true)
    expect(stringifySpy).not.toHaveBeenCalled()
  })
})
