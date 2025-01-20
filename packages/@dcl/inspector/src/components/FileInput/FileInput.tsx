import React, { useImperativeHandle, useCallback, useEffect, useRef } from 'react'
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

export interface InputRef {
  onClick: () => void;
}

export const FileInput = React.forwardRef<InputRef, React.PropsWithChildren<PropTypes>>((props, parentRef) => {
  const { disabled, onDrop } = props
  const acceptExtensions = Object.values(props.accept ?? []).flat()
  const inputRef = useRef<HTMLInputElement>(null)

  const [{ isHover }, drop] = useDrop(
    () => ({
      accept: [NativeTypes.FILE],
      drop(item: { files: File[] }) {
        if (onDrop) onDrop(item.files)
      },
      canDrop(item: { files: File[] }) {
        return !disabled && item.files.every((file) => !!acceptExtensions.find((ext) => file.name.endsWith(ext)))
      },
      collect: (monitor) => ({
        isHover: monitor.canDrop() && monitor.isOver()
      })
    }),
    [props]
  )

  const handleClick = useCallback(() => {
    inputRef?.current?.click()
  }, [inputRef])

  const handleFileSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const files = Array.from(e.target.files ?? [])
      onDrop && onDrop(files)
    },
    [onDrop]
  )

  useEffect(() => {
    props.onHover?.(isHover)
    return () => props.onHover?.(false)
  }, [isHover])

  useImperativeHandle(parentRef, () => ({
    onClick: handleClick,
  }), [handleClick]);

  return (
    <div ref={drop}>
      <input
        disabled={disabled}
        ref={inputRef}
        accept={parseAccept(props.accept)}
        type="file"
        tabIndex={-1}
        style={{ display: 'none' }}
        onChange={handleFileSelected}
        multiple={!!props.multiple}
      />
      {props.children}
    </div>
  )
})

export default FileInput
