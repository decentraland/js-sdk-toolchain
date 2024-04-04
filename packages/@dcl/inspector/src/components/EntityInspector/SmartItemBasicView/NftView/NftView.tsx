import React, { useCallback, useState } from 'react'
import { Entity, NftFrameType, PBNftShape } from '@dcl/ecs'
import { withSdk, WithSdkProps } from '../../../../hoc/withSdk'
import { useHasComponent } from '../../../../hooks/sdk/useHasComponent'
import { useComponentValue } from '../../../../hooks/sdk/useComponentValue'
import { Block } from '../../../Block'
import { TextField, Dropdown, ColorField, DropdownChangeEvent } from '../../../ui'
import { toColor3, toHex } from '../../../ui/ColorField/utils'
import {
  UrnTokens,
  buildTokens,
  getUrn,
  isValidUrn,
  NETWORKS,
  DEFAULT_NETWORK,
  NFT_STYLES
} from '../../NftShapeInspector/utils'

export default React.memo(
  withSdk<WithSdkProps & { entity: Entity }>(({ sdk, entity }) => {
    const { NftShape } = sdk.components
    const [componentValue] = useComponentValue<PBNftShape>(entity, NftShape)
    const hasNftShape = useHasComponent(entity, NftShape)
    const [urnTokens, setUrnTokens] = useState<UrnTokens>(buildTokens(componentValue))

    const handleUrnTokenChange = useCallback(
      async (tokens: UrnTokens) => {
        const newTokens = { ...urnTokens, ...tokens }
        const urn = getUrn(newTokens)
        if (isValidUrn(urn)) {
          sdk.operations.updateValue(NftShape, entity, { ...NftShape.get(entity), urn })
          await sdk.operations.dispatch()
        }
        setUrnTokens(newTokens)
      },
      [urnTokens]
    )

    const handleColorChange = useCallback(async ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      const color = toColor3(value)
      sdk.operations.updateValue(NftShape, entity, { ...NftShape.get(entity), color })
      await sdk.operations.dispatch()
    }, [])

    const handleStyleChange = useCallback(async ({ target: { value } }: DropdownChangeEvent) => {
      const style = Number(value) as NftFrameType
      sdk.operations.updateValue(NftShape, entity, { ...NftShape.get(entity), style })
      await sdk.operations.dispatch()
    }, [])

    if (!hasNftShape) return null

    return (
      <>
        <Dropdown
          options={NETWORKS}
          label="Network"
          value={urnTokens.network || DEFAULT_NETWORK.value}
          onChange={(e) => handleUrnTokenChange({ network: Number(e.target.value) })}
        />
        <TextField
          type="text"
          label="NFT Collection Contract"
          value={urnTokens.contract || ''}
          onChange={(e) => handleUrnTokenChange({ contract: e.target.value })}
        />
        <TextField
          type="text"
          label="Token ID"
          value={urnTokens.token || ''}
          onChange={(e) => handleUrnTokenChange({ token: e.target.value })}
        />
        <Block label="Background Color">
          <ColorField value={toHex(componentValue.color)} onChange={handleColorChange} />
        </Block>
        <Block label="Frame Type">
          <Dropdown
            options={NFT_STYLES}
            value={componentValue.style ?? NftFrameType.NFT_NONE}
            onChange={handleStyleChange}
          />
        </Block>
      </>
    )
  })
)
