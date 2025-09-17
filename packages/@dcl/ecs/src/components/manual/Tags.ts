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

export interface Tags {
  tags: Tag[]
}

export type TagComponent = LastWriteWinElementSetComponentDefinition<Tags>

function defineTagsComponent(engine: Pick<IEngine, 'defineComponent'>) {
  const Tags = engine.defineComponent('core::Tags', {
    tags: Schemas.Map({
      name: Schemas.String,
      type: Schemas.EnumNumber(TagType, TagType.Custom)
    })
  })

  return Tags
}

export default defineTagsComponent
