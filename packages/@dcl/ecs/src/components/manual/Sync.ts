import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine/types'
import { Schemas } from '../../schemas'

export type SyncComponent = LastWriteWinElementSetComponentDefinition<SyncType>
export interface SyncType {
  componentIds: number[]
}

function defineSyncComponent(engine: Pick<IEngine, 'defineComponent'>) {
  const Sync = engine.defineComponent('core-schema::Sync', {
    componentIds: Schemas.Array(Schemas.Int64)
  })
  return Sync
}

export default defineSyncComponent
