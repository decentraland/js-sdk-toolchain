import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine/types'
import { Schemas } from '../../schemas'

export enum TagType {
  Engine = 1,
  Custom = 2
}

export type Tag = {
  name: string
  type: TagType
}
export interface TagsType {
  tags: Tag[]
}

export type TagsComponent = LastWriteWinElementSetComponentDefinition<TagsType>

function defineTagsComponent(engine: Pick<IEngine, 'defineComponent'>) {
  const Tag = Schemas.Map({
    name: Schemas.String,
    type: Schemas.EnumNumber(TagType, TagType.Custom)
  })

  const Tags = engine.defineComponent('core-schema::Tags', {
    tags: Schemas.Array(Tag)
  })

  return Tags
}

export default defineTagsComponent
