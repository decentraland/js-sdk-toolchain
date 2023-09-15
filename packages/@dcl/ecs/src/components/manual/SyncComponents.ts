import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine/types'
import { Schemas } from '../../schemas'

export interface ISyncComponentsType {
  componentIds: number[]
}
export type ISyncComponents = LastWriteWinElementSetComponentDefinition<ISyncComponentsType>

function defineSyncComponents(engine: Pick<IEngine, 'defineComponent'>) {
  const SyncComponents = engine.defineComponent('core-schema::Sync-Components', {
    componentIds: Schemas.Array(Schemas.Int64)
  })
  return SyncComponents
}

export default defineSyncComponents
