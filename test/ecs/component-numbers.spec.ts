import { componentNumberFromName, MAX_STATIC_COMPONENT } from '../../packages/@dcl/ecs/src/components/component-number'
import { coreComponentMappings } from '../../packages/@dcl/ecs/src/components/generated/component-names.gen'

describe('component number generator', () => {
  it('all core components resolve to a <2048 number', () => {
    for (const [key, value] of Object.entries(coreComponentMappings)) {
      expect({ [key]: componentNumberFromName(key) }).toEqual({ [key]: value })
      expect(componentNumberFromName(key)).toBeLessThan(2048)
    }
  })
  it('it always returns unsigned integers', () => {
    const testCases: string[] = [
      '',
      'a',
      'b',
      'c',
      'aaa',
      'bbb',
      'ccc',
      'PositionSchema',
      'VelocitySchema',
      'string',
      '8888',
      'bouncing billboard',
      '889',
      'MoveTransportData',
      'MoveTransportData2',
      'my-scene::Door',
      'int8'
    ]

    for (const key of testCases) {
      expect(componentNumberFromName(key)).toBeGreaterThan(MAX_STATIC_COMPONENT)
    }
  })
})
