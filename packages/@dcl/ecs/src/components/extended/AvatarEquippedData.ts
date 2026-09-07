import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import { AvatarEquippedDataSchema } from '../generated/AvatarEquippedData.gen'
import { PBAvatarEquippedData } from '../generated/pb/decentraland/sdk/components/avatar_equipped_data.gen'

/**
 * @public
 * AvatarEquippedData with `forceRender` optional: the wire type is a repeated field (always present, so the
 * generated type requires it), but a scene rarely needs it and shouldn't have to pass `[]`.
 */
export type AvatarEquippedDataType = Omit<PBAvatarEquippedData, 'forceRender'> & {
  forceRender?: string[] | undefined
}

/**
 * @public
 */
export type AvatarEquippedDataComponentDefinitionExtended =
  LastWriteWinElementSetComponentDefinition<AvatarEquippedDataType>

export function defineAvatarEquippedDataComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): AvatarEquippedDataComponentDefinitionExtended {
  const patchedSchema = { ...AvatarEquippedDataSchema }
  const origSerialize = patchedSchema.serialize
  patchedSchema.serialize = (value: any, builder: any) => {
    origSerialize(value.forceRender === undefined ? { ...value, forceRender: [] } : value, builder)
  }

  const theComponent = engine.defineComponentFromSchema('core::AvatarEquippedData', patchedSchema)
  return theComponent as unknown as AvatarEquippedDataComponentDefinitionExtended
}
