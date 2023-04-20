import { NullEngine } from '@babylonjs/core/Engines/nullEngine'
import { setupEngine } from '.'

describe('When setting up the engine', () => {
  const xhrMockClass = () => ({
    open            : jest.fn(),
    send            : jest.fn(),
    setRequestHeader: jest.fn(),
    addEventListener: jest.fn()
  })

  ;(globalThis as any).XMLHttpRequest = jest.fn().mockImplementation(xhrMockClass)

  it('should create a scene', () => {
    const engine = new NullEngine()
    const { scene } = setupEngine(engine)
    expect(scene).toBeDefined()
    engine.stopRenderLoop()
  })
})
