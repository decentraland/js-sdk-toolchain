import { Entity } from '@dcl/ecs'
import { DataLayerContext, DeleteEntity, DispatchOperation } from '../../remote-data-layer'

export async function deleteEntity(operation: DeleteEntity, { engine }: Omit<DataLayerContext, 'fs'>) {
  const { entityId } = operation
  engine.removeEntity(entityId as Entity)
  await engine.update(1 / 16)
}

export function deleteEntityOperation(entityId: number): DispatchOperation {
  return { operation: { $case: 'deleteEntity', deleteEntity: { entityId } } }
}

export default deleteEntity