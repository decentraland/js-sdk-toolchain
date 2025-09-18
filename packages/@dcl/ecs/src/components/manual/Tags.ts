import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine/types'
import { Entity } from '../../engine'
import { Schemas } from '../../schemas'

export interface TagsType {
  tags: string[]
}

export interface TagsComponentDefinition extends LastWriteWinElementSetComponentDefinition<TagsType> {
  /**
   * @public
   *
   * Add a tag to the entity's Tags component
   * @param entity - entity to add the tag to
   * @param tagName - the tag name to add
   * @returns true if successful, false if the entity doesn't have a Tags component
   */
  addTag(entity: Entity, tagName: string): boolean

  /**
   * @public
   *
   * Remove a tag from the entity's Tags component
   * @param entity - entity to remove the tag from
   * @param tagName - the tag name to remove
   * @returns true if successful, false if the entity doesn't have a Tags component or the tag doesn't exist
   */
  removeTag(entity: Entity, tagName: string): boolean
}

export type TagsComponent = TagsComponentDefinition

function defineTagsComponent(engine: Pick<IEngine, 'defineComponent'>): TagsComponentDefinition {
  const Tags = engine.defineComponent('core-schema::Tags', {
    tags: Schemas.Array(Schemas.String)
  })

  return {
    ...Tags,
    addTag(entity: Entity, tagName: string): boolean {
      const tagsComponent = Tags.getMutableOrNull(entity)

      if (tagsComponent) {
        tagsComponent.tags.push(tagName)
        return true
      } else {
        Tags.createOrReplace(entity, { tags: [tagName] })
      }

      return true
    },
    removeTag(entity: Entity, tagName: string): boolean {
      const tagsComponent = Tags.getMutableOrNull(entity)
      if (!tagsComponent || !tagsComponent.tags) return false

      const tagIndex = tagsComponent.tags.indexOf(tagName)
      if (tagIndex === -1) return false

      tagsComponent.tags.splice(tagIndex, 1)
      return true
    }
  }
}

export default defineTagsComponent
