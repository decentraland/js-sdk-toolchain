import { useCallback, useRef } from 'react'
import { useDrop } from 'react-dnd'

import { Block } from '../../../Block'
import { SelectField } from '../../SelectField'
import { TextField } from '../../../ui/TextField'
import { Container } from '../../../Container'
import { Props, Texture, TEXTURE_TYPES, WRAP_MODES, FILTER_MODES } from './types'
import { ProjectAssetDrop, getNode } from '../../../../lib/sdk/drag-drop'
import { AssetNodeItem } from '../../../ProjectAssetExplorer/types'
import { isModel, isValidTexture } from './utils'

const DROP_TYPES = ['project-asset']

function TextureInspector({ label, texture, files, getInputProps }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const changeValue = useCallback((value: AssetNodeItem) => {
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    const inputEvent = new Event('input', { bubbles: true })

    set?.call(inputRef.current, value.asset.src)
    inputRef.current?.dispatchEvent(inputEvent)
  }, [])

  const [{ isHover }, drop] = useDrop(
    () => ({
      accept: DROP_TYPES,
      drop: ({ value, context }: ProjectAssetDrop, monitor) => {
        if (monitor.didDrop()) return
        const node = context.tree.get(value)!
        const model = getNode(node, context.tree, isModel)
        if (model) changeValue(model)
      },
      canDrop: ({ value, context }: ProjectAssetDrop) => {
        const node = context.tree.get(value)!
        return !!getNode(node, context.tree, isModel)
      },
      collect: (monitor) => ({
        isHover: monitor.canDrop() && monitor.isOver()
      })
    }),
    [files]
  )

  const type = getInputProps(`${texture}.type`)
  const src = getInputProps(`${texture}.src`)
  const isValid = isValidTexture(src.value, files)

  return (
    <Container label={label} className={label} initialOpen={false}>
      <Block>
        <SelectField label="Type" options={TEXTURE_TYPES} {...type} />
      </Block>
      <Block ref={drop}>
        {type.value === Texture.TT_TEXTURE && (
          <TextField ref={inputRef} label="Path" type="text" error={!isValid} drop={isHover} {...src} />
        )}
        {/* {type.value === Texture.TT_AVATAR_TEXTURE && <TextField label="User ID" {...getInputProps(`${texture}.userId`)} />}
        {type.value === Texture.TT_VIDEO_TEXTURE && <TextField label="Video player entity" {...getInputProps(`${texture}.videoPlayerEntity`)} />} */}
      </Block>
      <Block>
        <SelectField label="Wrap mode" options={WRAP_MODES} {...getInputProps(`${texture}.wrapMode`)} />
      </Block>
      <Block>
        <SelectField label="Filter node" options={FILTER_MODES} {...getInputProps(`${texture}.filterMode`)} />
      </Block>
    </Container>
  )
}

export default TextureInspector
