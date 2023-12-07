import { useCallback } from 'react'

import { withSdk } from '../../../hoc/withSdk'
import { useHasComponent } from '../../../hooks/sdk/useHasComponent'
import { useComponentInput } from '../../../hooks/sdk/useComponentInput'
import { Block } from '../../Block'
import { Container } from '../../Container'
import { FileUploadField, Dropdown, Label } from '../../ui'
import { ACCEPTED_FILE_TYPES } from '../../ui/FileUploadField/types'
import { Props } from './types'
import { fromGltf, toGltf, isValidInput, COLLISION_LAYERS, isModel } from './utils'
import { useAppSelector } from '../../../redux/hooks'
import { selectAssetCatalog } from '../../../redux/app'

import './GltfInspector.css'

export default withSdk<Props>(({ sdk, entity }) => {
  const files = useAppSelector(selectAssetCatalog)
  const { GltfContainer } = sdk.components

  const hasGltf = useHasComponent(entity, GltfContainer)
  const handleInputValidation = useCallback(({ src }: { src: string }) => !!files && isValidInput(files, src), [files])
  const { getInputProps, isValid } = useComponentInput(
    entity,
    GltfContainer,
    fromGltf(files?.basePath ?? ''),
    toGltf(files?.basePath ?? ''),
    handleInputValidation,
    [files]
  )

  const handleRemove = useCallback(async () => {
    sdk.operations.removeComponent(entity, GltfContainer)
    await sdk.operations.dispatch()
  }, [])

  const handleDrop = useCallback(async (src: string) => {
    const { operations } = sdk
    operations.updateValue(GltfContainer, entity, { src })
    await operations.dispatch()
  }, [])

  if (!hasGltf) return null

  return (
    <Container label="GLTF" className="GltfInspector" onRemoveContainer={handleRemove}>
      <Block>
        <FileUploadField
          {...getInputProps('src')}
          label="Path"
          accept={ACCEPTED_FILE_TYPES['model']}
          onDrop={handleDrop}
          error={files && !isValid}
          isValidFile={isModel}
        />
      </Block>
      <div className="column">
        <Label text="Collisions" header />
        <Block>
          <Dropdown label="Visible layer" options={COLLISION_LAYERS} {...getInputProps('visibleMeshesCollisionMask')} />
          <Dropdown
            label="Invisible layer"
            options={COLLISION_LAYERS}
            {...getInputProps('invisibleMeshesCollisionMask')}
          />
        </Block>
      </div>
    </Container>
  )
})
