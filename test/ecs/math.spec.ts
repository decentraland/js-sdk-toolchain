import * as Math from '../../packages/@dcl/sdk/src/math'

describe('Events System', () => {
  it('should get Math exported fns', () => {
    expect(Math.DEG2RAD).toBeDefined()
    expect(Math.RAD2DEG).toBeDefined()
    expect(Math.Quaternion).toBeDefined()
    expect(Math.Vector3).toBeDefined()
    expect(Math.Color3).toBeDefined()
    expect(Math.Color4).toBeDefined()
    expect(Math.Scalar).toBeDefined()
    expect(Math.Matrix).toBeDefined()
    expect(Math.Plane).toBeDefined()
  })
})
