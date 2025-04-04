import { IEngine, LastWriteWinElementSetComponentDefinition } from '../../engine'
import { AvatarEquippedDataSchema } from '../generated/AvatarEquippedData.gen'
import { PBAvatarEquippedData } from '../generated/pb/decentraland/sdk/components/avatar_equipped_data.gen'

/**
 * @public
 */
export type AvatarEquippedDataComponentDefinitionExtended =
  LastWriteWinElementSetComponentDefinition<AvatarEquippedDataType>

export type AvatarEquippedDataType = Omit<PBAvatarEquippedData, 'forceRender'> & {
  forceRender?: string[] | undefined
}

export function defineAvatarEquippedDataComponent(
  engine: Pick<IEngine, 'defineComponentFromSchema'>
): AvatarEquippedDataComponentDefinitionExtended {
  const patchedSchema = { ...AvatarEquippedDataSchema }
  const origSerialize = patchedSchema.serialize
  patchedSchema.serialize = (value: any, builder: any) => {
    if (value.forceRender === undefined) {
      origSerialize({ forceRender: [], ...value }, builder)
    } else {
      origSerialize(value, builder)
    }
  }

  const theComponent = engine.defineComponentFromSchema('core::AvatarEquippedData', patchedSchema)
  return theComponent as unknown as AvatarEquippedDataComponentDefinitionExtended
}
