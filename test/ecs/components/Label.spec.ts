import { Engine, components, Schemas, LastWriteWinElementSetComponentDefinition } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'

describe('Generated Raycast ProtoBuf', () => {
  it('should serialize/deserialize Raycast', () => {
    const newEngine = Engine()
    newEngine.defineComponent('inspector::EntityNode', {
      label: Schemas.String
    })

    const Label = components.Label(newEngine)

    testComponentSerialization(Label as LastWriteWinElementSetComponentDefinition<unknown>, {
      label: 'CASLA'
    })

    expect(newEngine.getEntityOrNullByLabel('CASLA')).toBeDefined()
    expect(newEngine.getEntityOrNullByLabel('Boedo')).toBe(null)
  })
})
