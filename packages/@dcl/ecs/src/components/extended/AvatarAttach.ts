import { ComponentDefinition, Entity, IEngine } from '../../engine'
import { AvatarAttach, PBAvatarAttach } from '../generated/index.gen'

/**
 * @public
 */
export type AvatarAttachComponentDefinition = Omit<
  ComponentDefinition<PBAvatarAttach>,
  'create' | 'createOrReplace'
>

type AvatarAttachCreate = Omit<PBAvatarAttach, 'avatarId'> & {
  avatarId?: string
}

/**
 * @public
 */
export interface AvatarAttachComponentDefinitionExtended
  extends AvatarAttachComponentDefinition {
  /**
   * @public
   * Create an AvatarAttach component
   * @param entity - entity to create the AvatarAttach component
   * @param val - avatar attach options
   */
  create(entity: Entity, val: AvatarAttachCreate): PBAvatarAttach
  createOrReplace(entity: Entity, val: AvatarAttachCreate): PBAvatarAttach
}

export function defineAvatarAttachComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): AvatarAttachComponentDefinitionExtended {
  const theComponent = AvatarAttach(engine)

  return {
    ...theComponent,
    create(entity: Entity, val: AvatarAttachCreate) {
      return theComponent.create(entity, val as Required<AvatarAttachCreate>)
    },
    createOrReplace(entity: Entity, val: AvatarAttachCreate) {
      return theComponent.create(entity, val as Required<AvatarAttachCreate>)
    }
  }
}
