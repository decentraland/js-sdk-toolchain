import { Engine } from '../../packages/@dcl/ecs/src/engine'
describe('Engine Network manager', () => {
  it('should define network manager', () => {
    const engine = Engine()
    expect(() => engine.getNetworkManager()).toThrowError()
    const networkManager = engine.addNetworkManager(512, [512, 522])
    expect(engine.getNetworkManager()).toEqual(networkManager)
    expect(networkManager.addEntity()).toBe(512)
  })
})
