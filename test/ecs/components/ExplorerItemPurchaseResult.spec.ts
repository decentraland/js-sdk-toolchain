import { components, Engine } from '../../../packages/@dcl/ecs/src'
import { testSchemaSerializationIdentity } from './assertion'

describe('Generated ExplorerItemPurchaseResult ProtoBuf', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const ExplorerItemPurchaseResult = components.ExplorerItemPurchaseResult(newEngine)

    testSchemaSerializationIdentity(ExplorerItemPurchaseResult.schema, {
      urn: 'urn:decentraland:item',
      timestamp: 10,
      requestId: 1,
      status: { $case: 'purchased', purchased: {} }
    })

    testSchemaSerializationIdentity(ExplorerItemPurchaseResult.schema, {
      urn: 'urn:decentraland:item',
      timestamp: 20,
      requestId: 0,
      status: { $case: 'dismissed', dismissed: {} }
    })

    testSchemaSerializationIdentity(ExplorerItemPurchaseResult.schema, {
      urn: 'urn:decentraland:item',
      timestamp: 30,
      requestId: 2,
      status: { $case: 'failed', failed: {} }
    })

    testSchemaSerializationIdentity(ExplorerItemPurchaseResult.schema, {
      urn: '',
      timestamp: 40,
      requestId: 0,
      status: undefined
    })

    testSchemaSerializationIdentity(ExplorerItemPurchaseResult.schema, ExplorerItemPurchaseResult.schema.create())
  })

  it('should accumulate appended values on the grow only value set', () => {
    const newEngine = Engine()
    const ExplorerItemPurchaseResult = components.ExplorerItemPurchaseResult(newEngine)
    const entity = newEngine.addEntity()

    ExplorerItemPurchaseResult.addValue(entity, {
      urn: 'urn:decentraland:item',
      timestamp: 1,
      requestId: 1,
      status: { $case: 'purchased', purchased: {} }
    })
    ExplorerItemPurchaseResult.addValue(entity, {
      urn: 'urn:decentraland:item',
      timestamp: 2,
      requestId: 2,
      status: { $case: 'dismissed', dismissed: {} }
    })

    expect(Array.from(ExplorerItemPurchaseResult.get(entity))).toEqual([
      { urn: 'urn:decentraland:item', timestamp: 1, requestId: 1, status: { $case: 'purchased', purchased: {} } },
      { urn: 'urn:decentraland:item', timestamp: 2, requestId: 2, status: { $case: 'dismissed', dismissed: {} } }
    ])
  })
})
