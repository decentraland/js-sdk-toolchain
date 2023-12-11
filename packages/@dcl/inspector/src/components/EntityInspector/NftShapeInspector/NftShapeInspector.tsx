import { useCallback, useState } from 'react'
import cx from 'classnames'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { getComponentValue } from '../../../hooks/sdk/useComponentValue'
import { analytics, Event } from '../../../lib/logic/analytics'
import { getAssetByModel } from '../../../lib/logic/catalog'
import { CoreComponents } from '../../../lib/sdk/components'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField } from '../../ui/TextField'
import { ColorField } from '../../ui/ColorField'
import {
  fromNftShape,
  toNftShape,
  isValidInput,
  NFT_STYLES,
  NETWORKS,
  isValidUrn,
  buildTokens,
  UrnTokens,
  getUrn,
  DEFAULT_NETWORK
} from './utils'
import type { Props } from './types'
import { Dropdown, InfoTooltip } from '../../ui'

import './NftShapeInspector.css'

export default withSdk<Props>(({ sdk, entity }) => {
  const { NftShape, GltfContainer } = sdk.components
  const [urnTokens, setUrnTokens] = useState<UrnTokens>(buildTokens(NftShape.getOrNull(entity)))

  const hasNftShape = useHasComponent(entity, NftShape)
  const handleInputValidation = useCallback(({ urn }: { urn: string }) => isValidInput(urn), [])
  const { getInputProps } = useComponentInput(entity, NftShape, fromNftShape, toNftShape, handleInputValidation)

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, NftShape)
    await sdk.operations.dispatch()
    const gltfContainer = getComponentValue(entity, GltfContainer)
    const asset = getAssetByModel(gltfContainer.src)
    analytics.track(Event.REMOVE_COMPONENT, {
      componentName: CoreComponents.NFT_SHAPE,
      itemId: asset?.id,
      itemPath: gltfContainer.src
    })
  }, [])

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
    <Container
      label="NftShape"
      className={cx('NftShape')}
      rightContent={
        <InfoTooltip
          text="URN structure: urn:decentraland:<CHAIN>:<CONTRACT_STANDARD>:<CONTRACT_ADDRESS>:<TOKEN_ID>."
          link="https://docs.decentraland.org/creator/development-guide/sdk7/display-a-certified-nft/#add-an-nft"
          type="help"
        />
      }
      onRemoveContainer={handleRemove}
    >
      <Block label="Urn" className="urn">
        <Dropdown
          options={NETWORKS}
          label="Network"
          value={urnTokens.network || DEFAULT_NETWORK.value}
          onChange={(e) => handleUrnTokenChange({ network: Number(e.target.value) })}
        />
        <TextField
          type="text"
          label="Contract"
          value={urnTokens.contract || ''}
          onChange={(e) => handleUrnTokenChange({ contract: e.target.value })}
        />
        <TextField
          type="text"
          label="Token"
          value={urnTokens.token || ''}
          onChange={(e) => handleUrnTokenChange({ token: e.target.value })}
        />
      </Block>
      <Block label="Color">
        <ColorField {...color} />
      </Block>
      <Block label="Frame style">
        <Dropdown options={NFT_STYLES} {...style} />
      </Block>
    </Container>
  )
})
