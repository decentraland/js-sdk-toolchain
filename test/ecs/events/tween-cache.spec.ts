import { Engine, IEngine } from '../../../packages/@dcl/ecs/src'
import { createTweenSystem, TweenSystem } from '../../../packages/@dcl/ecs/src/systems/tween'

describe('createTweenSystem', () => {
  let firstEngine: IEngine
  let firstTweenSystem: TweenSystem
  let secondEngine: IEngine
  let secondTweenSystem: TweenSystem

  beforeEach(() => {
    firstEngine = Engine()
    secondEngine = Engine()
    secondEngine._id = firstEngine._id
    firstTweenSystem = createTweenSystem(firstEngine)
    secondTweenSystem = createTweenSystem(secondEngine)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('when different engines have the same numeric identifier', () => {
    it('should create an independent tween system for each engine', () => {
      expect(firstTweenSystem).not.toBe(secondTweenSystem)
    })
  })

  describe('when the same engine requests the tween system more than once', () => {
    it('should return the existing tween system', () => {
      expect(createTweenSystem(firstEngine)).toBe(firstTweenSystem)
    })
  })
})
