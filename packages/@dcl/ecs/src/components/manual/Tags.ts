import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine/types'
import { Schemas } from '../../schemas'

export interface TagsType {
  tags: string[]
}

export type TagsComponent = LastWriteWinElementSetComponentDefinition<TagsType>

function defineTagsComponent(engine: Pick<IEngine, 'defineComponent'>) {
  const Tags = engine.defineComponent('core-schema::Tags', {
    tags: Schemas.Array(Schemas.String)
  })
  return Tags
}

export default defineTagsComponent
