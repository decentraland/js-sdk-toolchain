import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine/types'
import { Schemas } from '../../schemas'

export interface ICreatedByType {
  address: string
}

export type ICreatedBy = LastWriteWinElementSetComponentDefinition<ICreatedByType>

function defineCreatedBy(engine: Pick<IEngine, 'defineComponent'>) {
  const CreatedBy = engine.defineComponent('core-schema::Created-By', {
    address: Schemas.String,
  })
  return CreatedBy
}

export default defineCreatedBy
