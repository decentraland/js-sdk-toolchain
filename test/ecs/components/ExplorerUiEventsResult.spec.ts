import { components, Engine, ExplorerUi } from '../../../packages/@dcl/ecs/src'
import { testSchemaSerializationIdentity } from './assertion'

describe('Generated ExplorerUiEventsResult ProtoBuf', () => {
  it('should serialize', () => {
    const newEngine = Engine()
    const ExplorerUiEventsResult = components.ExplorerUiEventsResult(newEngine)

    testSchemaSerializationIdentity(ExplorerUiEventsResult.schema, {
      ui: ExplorerUi.EU_MAP,
      timestamp: 10,
      event: { $case: 'opened', opened: {} }
    })

    testSchemaSerializationIdentity(ExplorerUiEventsResult.schema, {
      ui: ExplorerUi.EU_MAP,
      timestamp: 20,
      event: { $case: 'closed', closed: {} }
    })

    testSchemaSerializationIdentity(ExplorerUiEventsResult.schema, {
      ui: ExplorerUi.EU_SETTINGS,
      timestamp: 30,
      event: { $case: 'opened', opened: {} }
    })

    testSchemaSerializationIdentity(ExplorerUiEventsResult.schema, {
      ui: ExplorerUi.EU_EVENTS,
      timestamp: 40,
      event: undefined
    })

    testSchemaSerializationIdentity(ExplorerUiEventsResult.schema, ExplorerUiEventsResult.schema.create())
  })

  it('should serialize every ExplorerUi panel', () => {
    const newEngine = Engine()
    const ExplorerUiEventsResult = components.ExplorerUiEventsResult(newEngine)

    const panels = [
      ExplorerUi.EU_SETTINGS,
      ExplorerUi.EU_MAP,
      ExplorerUi.EU_BACKPACK,
      ExplorerUi.EU_CAMERA_REEL,
      ExplorerUi.EU_COMMUNITIES,
      ExplorerUi.EU_PLACES,
      ExplorerUi.EU_EVENTS
    ]

    for (const ui of panels) {
      testSchemaSerializationIdentity(ExplorerUiEventsResult.schema, {
        ui,
        timestamp: ui + 1,
        event: { $case: 'opened', opened: {} }
      })
    }
  })

  it('should accumulate appended values on the grow only value set', () => {
    const newEngine = Engine()
    const ExplorerUiEventsResult = components.ExplorerUiEventsResult(newEngine)
    const entity = newEngine.addEntity()

    ExplorerUiEventsResult.addValue(entity, {
      ui: ExplorerUi.EU_BACKPACK,
      timestamp: 1,
      event: { $case: 'opened', opened: {} }
    })
    ExplorerUiEventsResult.addValue(entity, {
      ui: ExplorerUi.EU_BACKPACK,
      timestamp: 2,
      event: { $case: 'closed', closed: {} }
    })

    expect(Array.from(ExplorerUiEventsResult.get(entity))).toEqual([
      { ui: ExplorerUi.EU_BACKPACK, timestamp: 1, event: { $case: 'opened', opened: {} } },
      { ui: ExplorerUi.EU_BACKPACK, timestamp: 2, event: { $case: 'closed', closed: {} } }
    ])
  })
})
