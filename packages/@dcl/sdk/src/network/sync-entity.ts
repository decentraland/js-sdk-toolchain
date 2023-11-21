import { Entity, NetworkEntity, SyncComponents } from '@dcl/ecs'
import { myProfile } from './utils'

export function syncEntity(entity: Entity, componentIds: number[], id?: number) {
  if (!myProfile?.networkId) {
    throw new Error('USER_ID NOT INITIALIZED')
  }
  // It it has an custom Id, then the networkId and the entityId should be the same for everyone
  // If not, use the profile as the networkId, and the real entityId to then map the entity
  const networkEntity =
    id !== undefined ? { entityId: id as Entity, networkId: 0 } : { entityId: entity, networkId: myProfile.networkId }
  NetworkEntity.createOrReplace(entity, networkEntity)
  SyncComponents.createOrReplace(entity, { componentIds })
}
