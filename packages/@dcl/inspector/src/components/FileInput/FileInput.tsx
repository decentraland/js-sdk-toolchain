import React, { useRef, PropsWithChildren, useCallback } from 'react'
import { useDrop } from 'react-dnd'
import { NativeTypes } from 'react-dnd-html5-backend'
import { PropTypes } from './types'

function parseAccept(accept: PropTypes['accept']) {
  let value = ''
  for (const [key, values] of Object.entries(accept ?? {})) {
    value += `${key},${values.join(',')},`
  }
  return value
}

export function FileInput(props: PropsWithChildren<PropTypes>) {
  const { onDrop } = props
  const inputRef = useRef<HTMLInputElement>(null)
  const acceptExtensions = Object.values(props.accept ?? []).flat()

  const [_, drop] = useDrop(
    () => ({
      accept: [NativeTypes.FILE],
      drop(item: { files: File[] }) {
        if (onDrop) onDrop(item.files)
      },
      canDrop(item: { files: File[] }) {
        return item.files.every((file) => !!acceptExtensions.find((ext) => file.name.endsWith(ext)))
      }
    }),
    [props]
  )

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(e.target.files ?? [])
      onDrop && onDrop(files)
    },
    [onDrop]
  )

  return (
    <div ref={drop} onClick={() => inputRef?.current?.click()}>
      <input
        disabled={props.disabled}
        ref={inputRef}
        accept={parseAccept(props.accept)}
        type="file"
        tabIndex={-1}
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />
      {props.children}
    </div>
  )
}

export default FileInput
