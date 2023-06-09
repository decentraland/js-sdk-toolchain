import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated Raycast ProtoBuf', () => {
  it('should serialize/deserialize Raycast', () => {
    const newEngine = Engine()
    const Name = components.Name(newEngine)

    testComponentSerialization(Name, {
      value: 'CASLA'
    })

    expect(newEngine.getEntityOrNullByName('CASLA')).toBeDefined()
    expect(newEngine.getEntityOrNullByName('Boedo')).toBe(null)
  })
})
