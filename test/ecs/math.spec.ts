import * as Math from '../../packages/@dcl/ecs/src/runtime/matha'

describe('Events System', () => {
  it('should get Math exported fns', () => {
    expect(Math.DEG2RAD).toBeDefined()
    expect(Math.RAD2DEG).toBeDefined()
    expect(Math.Quaternion).toBeDefined()
    expect(Math.Vector3).toBeDefined()
    expect(Math.Color3).toBeDefined()
    expect(Math.Color4).toBeDefined()
    expect(Math.Scalar).toBeDefined()
  })
})
