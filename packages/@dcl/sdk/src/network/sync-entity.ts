import { Entity, NetworkEntity, SyncComponents } from '@dcl/ecs'
import { myProfile } from './utils'

export function syncEntity(entity: Entity, components: number[], id?: number) {
  if (!myProfile?.networkId) {
    throw new Error('USER_ID NOT INITIALIZED')
  }
  // It it has an identifier, then the networkId and the identifier should be the same for everyone
  // If not, use the profile as the networkId, and the real entityId to then map the entity
  const networkEntity =
    id !== undefined ? { entityId: id as Entity, networkId: 0 } : { entityId: entity, networkId: myProfile.networkId }
  NetworkEntity.create(entity, networkEntity)
  SyncComponents.create(entity, { componentIds: components })
}
