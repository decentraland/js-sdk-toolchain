import { Entity } from '../../engine'
import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine/types'
import { Schemas } from '../../schemas'

export interface INetowrkEntityType {
  networkId: number
  entityId: Entity
}

export type INetowrkEntity = LastWriteWinElementSetComponentDefinition<INetowrkEntityType>

function defineNetworkEntityComponent(engine: Pick<IEngine, 'defineComponent'>) {
  const EntityNetwork = engine.defineComponent('core-schema::Network-Entity', {
    networkId: Schemas.Int64,
    entityId: Schemas.Entity
  })
  return EntityNetwork
}

export default defineNetworkEntityComponent
