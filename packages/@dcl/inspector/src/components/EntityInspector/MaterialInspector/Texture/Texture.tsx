import { useCallback } from 'react'

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
      srcInput?.onChange && srcInput.onChange({ target: { value: src } } as React.ChangeEvent<HTMLInputElement>)
    },
    [texture, getInputProps]
  )

  const type = getInputProps(`${texture}.type`)
  const src = getInputProps(`${texture}.src`)
  const isValid = isValidTexture(src.value, files)

  return (
    <Container label={label} className={label} initialOpen={false} borderer>
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
        {/* {type.value === Texture.TT_AVATAR_TEXTURE && <TextField label="User ID" {...getInputProps(`${texture}.userId`)} />}
        {type.value === Texture.TT_VIDEO_TEXTURE && <TextField label="Video player entity" {...getInputProps(`${texture}.videoPlayerEntity`)} />} */}
      </Block>
      <Block>
        <Dropdown label="Wrap mode" options={WRAP_MODES} {...getInputProps(`${texture}.wrapMode`)} />
        <Dropdown label="Filter node" options={FILTER_MODES} {...getInputProps(`${texture}.filterMode`)} />
      </Block>
    </Container>
  )
}

export default TextureInspector
