import React, { useCallback, useRef, useState } from 'react'
import { useDrop } from 'react-dnd'
import cx from 'classnames'
import { VscFolderOpened as FolderIcon } from 'react-icons/vsc'
import { IoAlertCircleOutline as AlertIcon } from 'react-icons/io5'

import { selectAssetCatalog } from '../../../redux/app'
import { useAppSelector } from '../../../redux/hooks'
import { DropTypesEnum, ProjectAssetDrop, getNode } from '../../../lib/sdk/drag-drop'
import { EXTENSIONS, withAssetDir } from '../../../lib/data-layer/host/fs-utils'

import { isAsset, isModel } from '../../EntityInspector/GltfInspector/utils'
import { isAudio, isAudioFile } from '../../EntityInspector/AudioSourceInspector/utils'
import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import { AssetNodeItem } from '../../ProjectAssetExplorer/types'

import { TextField } from '../TextField'

import { type Props } from './types'

import './FileUploadField.css'

function parseAccept(accept: string[]) {
  return accept.join(',')
}

const FileUploadField: React.FC<Props> = ({
  className,
  disabled,
  value,
  isEnabledFileExplorer,
  onDrop,
  isValidFile,
  accept = EXTENSIONS
}) => {
  const [path, setPath] = useState<string | undefined>(value?.toString())
  const [error, setError] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const files = useAppSelector(selectAssetCatalog)

  const removeBase = useCallback(
    (path?: string) => {
      return path ? (files?.basePath ? path.replace(files.basePath + '/', '') : path) : ''
    },
    [files]
  )

  const addBase = useCallback(
    (path: string) => {
      return files?.basePath ? `${files.basePath}/${path}` : path
    },
    [files]
  )

  const handleDrop = useCallback(
    (src: string) => {
      setPath(src)
      onDrop && onDrop(src)
    },
    [onDrop]
  )

  const isValid = useCallback(
    (node: TreeNode): node is AssetNodeItem => {
      return isValidFile ? isValidFile(node) : isModel(node) || isAudio(node)
    },
    [isValidFile]
  )

  const [{ isHover, canDrop }, drop] = useDrop(
    () => ({
      accept: [DropTypesEnum.ProjectAsset],
      drop: ({ value, context }: ProjectAssetDrop, monitor) => {
        if (monitor.didDrop()) return
        const node = context.tree.get(value)!
        const element = getNode(node, context.tree, isValid)
        if (element) {
          handleDrop(withAssetDir(element.asset.src))
          setError(false)
        } else {
          setError(true)
        }
      },
      canDrop: ({ value, context }: ProjectAssetDrop) => {
        const node = context.tree.get(value)!
        return !!getNode(node, context.tree, isValid)
      },
      collect: (monitor) => ({
        isHover: monitor.canDrop() && monitor.isOver(),
        canDrop: monitor.canDrop()
      })
    }),
    [files, isValid]
  )

  const handleClick = useCallback(() => {
    inputRef.current?.click()
  }, [inputRef])

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file && (isAsset(file.name) || isAudioFile(file.name))) {
        setPath(file.name)
        setError(false)
      } else {
        setError(true)
      }
    },
    [setPath, setError]
  )

  const handleChangeTextField = useCallback(
    ({ target: { value } }: React.ChangeEvent<HTMLSelectElement>) => {
      if (value && (isAsset(value) || isAudioFile(value))) {
        setPath(addBase(value))
        setError(false)
      } else {
        setError(true)
      }
    },
    [addBase, setPath, setError]
  )

  return (
    <div className={cx('FileUploadFieldContainer', className)}>
      <div className={cx('FileUploadInputContainer', { error, disabled, droppeable: canDrop })}>
        <TextField
          className="FileUploadFieldInput"
          ref={drop}
          placeholder="Path File"
          onChange={handleChangeTextField}
          value={removeBase(path)}
          error={!!error}
          disabled={disabled}
          drop={isHover}
        />
        <input type="file" ref={inputRef} onChange={handleChange} accept={parseAccept(accept)} />
        {isEnabledFileExplorer && (
          <button className="FileUploadFieldButton" onClick={handleClick} disabled={disabled}>
            <FolderIcon size={16} />
          </button>
        )}
      </div>
      {error && (
        <div className="FileUploadFieldError">
          <AlertIcon size={16} />
          File not valid.
        </div>
      )}
    </div>
  )
}

export default React.memo(FileUploadField)
