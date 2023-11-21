import { Entity } from '../../engine'
import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine/types'
import { Schemas } from '../../schemas'

export interface INetowrkParentType {
  networkId: number
  entityId: Entity
}

export type INetowrkParent = LastWriteWinElementSetComponentDefinition<INetowrkParentType>

function defineNetworkParentComponent(engine: Pick<IEngine, 'defineComponent'>) {
  const EntityNetwork = engine.defineComponent('core-schema::Network-Parent', {
    networkId: Schemas.Int64,
    entityId: Schemas.Entity
  })
  return EntityNetwork
}

export default defineNetworkParentComponent
