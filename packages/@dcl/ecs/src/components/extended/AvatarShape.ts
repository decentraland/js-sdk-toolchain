import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import { AvatarShapeSchema } from '../generated/AvatarShape.gen'
import { PBAvatarShape } from '../generated/pb/decentraland/sdk/components/avatar_shape.gen'


/**
 * @public
 */
export interface AvatarShapeComponentDefinitionExtended
  extends LastWriteWinElementSetComponentDefinition<AvatarShapeType> { }

export type AvatarShapeType = Omit<PBAvatarShape, 'forceRender'> & {
  forceRender?: string[] | undefined
}

export function defineAvatarShapeComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): AvatarShapeComponentDefinitionExtended {
  const patchedSchema = { ...AvatarShapeSchema }
  const origSerialize = patchedSchema.serialize
  patchedSchema.serialize = (value: any, builder: any) => {
    if (value.forceRender === undefined) {
      origSerialize({ forceRender: [], ...value }, builder)
    } else {
      origSerialize(value, builder)
    }
  }

  const theComponent = engine.defineComponentFromSchema("core::AvatarShape", patchedSchema);
  return theComponent as unknown as AvatarShapeComponentDefinitionExtended
}
