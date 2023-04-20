import { NullEngine } from '@babylonjs/core/Engines/nullEngine'
import { setupEngine } from '.'
import { mockXMLHttpRequest } from '../../../../test/utils'
import { Engine } from '@babylonjs/core'

describe('When setting up the engine', () => {
  let engine: Engine
  let resetMockXMLHttpRequest: () => void

  beforeEach(() => {
    engine = new NullEngine()
    resetMockXMLHttpRequest = mockXMLHttpRequest()
  })

  afterEach(() => {
    engine.dispose()
    resetMockXMLHttpRequest()
  })

  it('should create a scene', () => {
    const { scene } = setupEngine(engine)
    expect(scene).toBeDefined()
  })
})
