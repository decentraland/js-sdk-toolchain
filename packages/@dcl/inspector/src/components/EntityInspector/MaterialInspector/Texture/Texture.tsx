import { useCallback } from 'react'
import { removeBasePath } from '../../../../lib/logic/remove-base-path'
import { Block } from '../../../Block'
import { Container } from '../../../Container'
import { Dropdown, FileUploadField } from '../../../ui'
import { ACCEPTED_FILE_TYPES } from '../../../ui/FileUploadField/types'
import { isModel, isValidTexture } from './utils'

import { Props, Texture, TEXTURE_TYPES, WRAP_MODES, FILTER_MODES } from './types'

function TextureInspector({ label, texture, files, getInputProps }: Props) {
  const handleDrop = useCallback(
    (src: string) => {
      const srcInput = getInputProps(`${texture}.src`)
      // The src comes with the basePath, so we need to remove it before setting the value because the utils fromTexture is adding it again
      // TODO: Refactor EntityInspector/MaterialInspector/Texture/utils.ts::fromTexture util to not remove the basePath
      const value = removeBasePath(files?.basePath ?? '', src)
      srcInput?.onChange &&
        srcInput.onChange({
          target: { value }
        } as React.ChangeEvent<HTMLInputElement>)
    },
    [files, texture, getInputProps]
  )

  const type = getInputProps(`${texture}.type`)
  const src = getInputProps(`${texture}.src`)
  const isValid = isValidTexture(src.value, files)

  return (
    <Container label={label} className={label} initialOpen={false} border>
      <Block>
        <Dropdown label="Type" options={TEXTURE_TYPES} {...type} />
      </Block>
      <Block>
        {type.value === Texture.TT_TEXTURE && (
          <FileUploadField
            {...src}
            label="Path"
            accept={ACCEPTED_FILE_TYPES['image']}
            onDrop={handleDrop}
            error={!!src.value && files && !isValid}
            isValidFile={isModel}
          />
        )}
        {/* {type.value === Texture.TT_AVATAR_TEXTURE && <TextField label="User ID" {...getInputProps(`${texture}.userId`)} />}*/}
      </Block>
      <Block>
        <Dropdown label="Wrap mode" options={WRAP_MODES} {...getInputProps(`${texture}.wrapMode`)} />
        <Dropdown label="Filter node" options={FILTER_MODES} {...getInputProps(`${texture}.filterMode`)} />
      </Block>
    </Container>
  )
}

export default TextureInspector
