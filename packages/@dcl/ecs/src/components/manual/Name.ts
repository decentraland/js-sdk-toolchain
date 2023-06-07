import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine/types'
import { Schemas } from '../../schemas'

export type NameComponent = LastWriteWinElementSetComponentDefinition<NameType>
export interface NameType {
  value: string
}

function defineNameComponent(engine: Pick<IEngine, 'defineComponent'>) {
  const Name = engine.defineComponent('core-schema::Name', {
    value: Schemas.String
  })
  return Name
}

export default defineNameComponent
