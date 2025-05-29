import { Engine, components } from '../../../packages/@dcl/ecs/src'
import { testComponentSerialization } from './assertion'
import { SyncStatus } from '../../../packages/@dcl/ecs/src/components/generated/pb/decentraland/sdk/components/synced_clock.gen'

describe('Generated SyncedClock ProtoBuf', () => {
  it('should serialize/deserialize SyncedClock', () => {
    const newEngine = Engine()
    const SyncedClock = components.SyncedClock(newEngine)

    // Test with different sync statuses
    testComponentSerialization(SyncedClock, {
      syncedTimestamp: 1234567890,
      status: SyncStatus.SS_UNINITIALIZED
    })

    testComponentSerialization(SyncedClock, {
      syncedTimestamp: 1234567890,
      status: SyncStatus.SS_SYNCHRONIZING
    })

    testComponentSerialization(SyncedClock, {
      syncedTimestamp: 1234567890,
      status: SyncStatus.SS_SYNCHRONIZED
    })

    testComponentSerialization(SyncedClock, {
      syncedTimestamp: 1234567890,
      status: SyncStatus.SS_ERROR
    })

    // Test with different timestamps
    testComponentSerialization(SyncedClock, {
      syncedTimestamp: 0,
      status: SyncStatus.SS_SYNCHRONIZED
    })

    testComponentSerialization(SyncedClock, {
      syncedTimestamp: 9007199254740991, // MAX_SAFE_INTEGER
      status: SyncStatus.SS_SYNCHRONIZED
    })
  })
})
