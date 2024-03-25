import React, { useCallback, useState } from 'react'
import { Entity } from '@dcl/ecs'
import { withSdk, WithSdkProps } from '../../../../hoc/withSdk'
import { useHasComponent } from '../../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../../hooks/sdk/useComponentInput'
import { Block } from '../../../Block'
import { TextField, Dropdown, ColorField } from '../../../ui'
import {
  UrnTokens,
  buildTokens,
  isValidInput,
  fromNftShape,
  toNftShape,
  getUrn,
  isValidUrn,
  NETWORKS,
  DEFAULT_NETWORK,
  NFT_STYLES
} from '../../NftShapeInspector/utils'

export default React.memo(
  withSdk<WithSdkProps & { entity: Entity }>(({ sdk, entity }) => {
    const { NftShape } = sdk.components
    const [urnTokens, setUrnTokens] = useState<UrnTokens>(buildTokens(NftShape.getOrNull(entity)))

    const hasNftShape = useHasComponent(entity, NftShape)
    const handleInputValidation = useCallback(({ urn }: { urn: string }) => isValidInput(urn), [])
    const { getInputProps } = useComponentInput(entity, NftShape, fromNftShape, toNftShape, handleInputValidation)

    if (!hasNftShape) return null

    const color = getInputProps('color')
    const style = getInputProps('style')

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
          <ColorField {...color} />
        </Block>
        <Block label="Frame Type">
          <Dropdown options={NFT_STYLES} {...style} />
        </Block>
      </>
    )
  })
)
