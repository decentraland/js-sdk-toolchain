import React, { useCallback, useEffect, useState } from 'react'
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
    const [componentValue, setComponentValue, isComponentEqual] = useComponentValue<PBNftShape>(entity, NftShape)
    const hasNftShape = useHasComponent(entity, NftShape)
    const [urnTokens, setUrnTokens] = useState<UrnTokens>(buildTokens(componentValue))
    const [color, setColor] = useState<string>(toHex(componentValue.color))
    const [style, setStyle] = useState<NftFrameType>(componentValue.style ?? NftFrameType.NFT_NONE)

    useEffect(() => {
      if (isComponentEqual({ ...componentValue, color: toColor3(color), style })) return
      setComponentValue({ ...componentValue, color: toColor3(color), style })
    }, [componentValue, color, style])

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

    const handleColorChange = useCallback(({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
      setColor(value)
    }, [])

    const handleStyleChange = useCallback(({ target: { value } }: DropdownChangeEvent) => {
      const style = Number(value) as NftFrameType
      setStyle(style)
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
          <ColorField value={color} onChange={handleColorChange} />
        </Block>
        <Block label="Frame Type">
          <Dropdown options={NFT_STYLES} value={style} onChange={handleStyleChange} />
        </Block>
      </>
    )
  })
)
