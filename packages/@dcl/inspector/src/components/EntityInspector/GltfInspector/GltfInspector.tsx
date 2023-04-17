import { useCallback, useState } from 'react'
import { Menu, Item } from 'react-contexify';
import { AiFillDelete as DeleteIcon} from 'react-icons/ai'
import cx from 'classnames';

import { AssetNodeItem } from '../../ProjectAssetExplorer/types'

import { withContextMenu } from '../../../hoc/withContextMenu'
import { WithSdkProps, withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { useContextMenu } from '../../../hooks/sdk/useContextMenu';
import { useFileSystem } from '../../../hooks/catalog/useFileSystem';

import { Block } from '../../Block'
import { Container } from '../../Container'
import { TextField } from '../TextField'
import { Props } from './types'
import { fromGltf, toGltf, isValidInput } from './utils';

const DROP_TYPES = ['project-asset-gltf']

export default withSdk<Props>(withContextMenu<WithSdkProps & Props>(({ sdk, entity, contextMenuId }) => {
  const [isHover, setIsHover] = useState(false)
  const { files } = useFileSystem()
  const { handleAction } = useContextMenu()
  const { GltfContainer } = sdk.components

  const hasGltf = useHasComponent(entity, GltfContainer)
  const handleInputValidation = useCallback(({ src }: { src: string }) => isValidInput(files, src), [files])
  const getInputProps = useComponentInput(entity, GltfContainer, fromGltf, toGltf, handleInputValidation)

  const handleRemove = useCallback(() => GltfContainer.deleteFrom(entity), [])
  const handleDrop = useCallback(({ value }: { value: AssetNodeItem }) => {
    GltfContainer.createOrReplace(entity, { src: value.asset.src })
  }, [])
  const handleDropHover = useCallback((hover: boolean) => setIsHover(hover), [])

  if (!hasGltf) return null

  return (
    <Container label="Gltf" className={cx("Gltf", { hover: isHover })}>
      <Menu id={contextMenuId}>
        <Item id="delete" onClick={handleAction(handleRemove)}><DeleteIcon /> Delete</Item>
      </Menu>
      <Block label="Path" acceptDropTypes={DROP_TYPES} onDrop={handleDrop} onDropHover={handleDropHover}>
        <TextField type="text" {...getInputProps('src')} />
      </Block>
    </Container>
  )
}))
