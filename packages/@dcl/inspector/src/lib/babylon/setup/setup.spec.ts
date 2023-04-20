import { NullEngine } from '@babylonjs/core/Engines/nullEngine'
import { setupEngine } from '.'

describe('When setting up the engine', () => {
  it('should create a scene', () => {
    const engine = new NullEngine()
    const { scene } = setupEngine(engine)
    expect(scene).toBeDefined()
  })
})
