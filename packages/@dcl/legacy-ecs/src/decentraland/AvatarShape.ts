import { ReadOnlyColor4 } from '@dcl/ecs-math'

import { WearableId } from '../decentraland/Types'
import { Component, ObservableComponent } from '../ecs/Component'
import { CLASS_ID } from './Components'

/**
 * @public
 */
@Component('engine.avatarShape', CLASS_ID.AVATAR_SHAPE)
export class AvatarShape extends ObservableComponent {
  @ObservableComponent.field
  id!: string

  @ObservableComponent.field
  name!: string

  @ObservableComponent.field
  expressionTriggerId!: string

  @ObservableComponent.field
  expressionTriggerTimestamp!: number

  @ObservableComponent.field
  bodyShape!: WearableId

  @ObservableComponent.field
  wearables!: WearableId[]

  @ObservableComponent.field
  emotes!: {
    slot: number
    urn: string
  }[]

  @ObservableComponent.field
  skinColor!: ReadOnlyColor4

  @ObservableComponent.field
  hairColor!: ReadOnlyColor4

  @ObservableComponent.field
  eyeColor!: ReadOnlyColor4

  @ObservableComponent.field
  useDummyModel: boolean = false

  @ObservableComponent.field
  talking: boolean = false

  @ObservableComponent.field
  forceRender!: string[]

  public static Dummy(): AvatarShape {
    const avatarShape = new AvatarShape()
    avatarShape.useDummyModel = true
    return avatarShape
  }
}
