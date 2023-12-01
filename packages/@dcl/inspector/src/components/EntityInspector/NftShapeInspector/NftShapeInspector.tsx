import { useCallback } from 'react'
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
import { SelectField } from '../SelectField'
import { fromNftShape, toNftShape, isValidInput, NFT_STYLES } from './utils'
import type { Props } from './types'
import { InfoTooltip } from '../../ui'

export default withSdk<Props>(({ sdk, entity }) => {
  const { NftShape, GltfContainer } = sdk.components

  const hasNftShape = useHasComponent(entity, NftShape)
  const handleInputValidation = useCallback(({ urn }: { urn: string }) => isValidInput(urn), [])
  const { getInputProps, isValid } = useComponentInput(
    entity,
    NftShape,
    fromNftShape,
    toNftShape,
    handleInputValidation
  )

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

  const urn = getInputProps('urn')
  const color = getInputProps('color')
  const style = getInputProps('style')

  return (
    <Container
      label="NftShape"
      className={cx('NftShape')}
      rightContent={
        <InfoTooltip
          text="URN structure: urn:decentraland:<CHAIN>:<CONTRACT_STANDARD>:<CONTRACT_ADDRESS>:<TOKEN_ID>"
          link="https://docs.decentraland.org/creator/development-guide/sdk7/display-a-certified-nft/#add-an-nft"
          type="help"
        />
      }
      onRemoveContainer={handleRemove}
    >
      <Block label="Urn">
        <TextField type="text" {...urn} error={!isValid} />
      </Block>
      <Block label="Color">
        <ColorField {...color} />
      </Block>
      <Block label="Frame style">
        <SelectField options={NFT_STYLES} {...style} />
      </Block>
    </Container>
  )
})
