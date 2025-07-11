import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDrop } from 'react-dnd'
import cx from 'classnames'
import { v4 as uuidv4 } from 'uuid'
import { VscFolderOpened as FolderIcon } from 'react-icons/vsc'

import { selectAssetCatalog, selectUploadFile, updateUploadFile } from '../../../redux/app'
import { useAppDispatch, useAppSelector } from '../../../redux/hooks'
import { importAsset } from '../../../redux/data-layer'
import { DropTypesEnum, LocalAssetDrop, getNode } from '../../../lib/sdk/drag-drop'
import { DIRECTORY, EXTENSIONS, withAssetDir } from '../../../lib/data-layer/host/fs-utils'

import { buildAssetPath, convertAssetToBinary, processAssets } from '../../ImportAsset/utils'
import { isModel } from '../../EntityInspector/GltfInspector/utils'
import { isAudio } from '../../EntityInspector/AudioSourceInspector/utils'
import { isModel as isTexture } from '../../EntityInspector/MaterialInspector/Texture/utils'
import { TreeNode } from '../../ProjectAssetExplorer/ProjectView'
import { AssetNodeItem } from '../../ProjectAssetExplorer/types'
import { isValidHttpsUrl } from '../../../lib/utils/url'

import { TextField } from '../TextField'
import { Message, MessageType } from '../Message'

import { type Props } from './types'

import './FileUploadField.css'

function parseAccept(accept: string[]) {
  return accept.join(',')
}

const FileUploadField: React.FC<Props> = ({
  className,
  disabled,
  value,
  isEnabledFileExplorer = true,
  error,
  label,
  onDrop,
  onChange,
  isValidFile,
  acceptURLs = false,
  accept = EXTENSIONS
}) => {
  const [path, setPath] = useState<string | undefined>(value?.toString())
  const [errorMessage, setErrorMessage] = useState<string | undefined>('File not valid.')
  const [dropError, setDropError] = useState<boolean>(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const files = useAppSelector(selectAssetCatalog)
  const uploadFile = useAppSelector(selectUploadFile)
  const dispatch = useAppDispatch()
  const id = useRef(uuidv4())

  useEffect(() => {
    if (uploadFile[id.current] && typeof uploadFile[id.current] === 'string' && path !== uploadFile[id.current]) {
      const uploadFilePath = uploadFile[id.current] as string
      setPath(uploadFilePath)
      const cleanUpdateUploadFile = { ...uploadFile }
      delete cleanUpdateUploadFile[id.current]
      dispatch(updateUploadFile(cleanUpdateUploadFile))
      onDrop && onDrop(uploadFilePath)
    }
  }, [uploadFile, onDrop])

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
      return isValidFile ? isValidFile(node) : isModel(node) || isAudio(node) || isTexture(node)
    },
    [isValidFile]
  )

  const isValidFileName = useCallback(
    (fileName: string = '') => {
      return accept.find((ext) => fileName.endsWith(ext))
    },
    [accept]
  )

  const [{ isHover, canDrop }, drop] = useDrop(
    () => ({
      accept: [DropTypesEnum.LocalAsset],
      drop: ({ value, context }: LocalAssetDrop, monitor) => {
        if (monitor.didDrop()) return
        const node = context.tree.get(value)!
        const element = getNode(node, context.tree, isValid)
        if (element) {
          handleDrop(withAssetDir(element.asset.src))
          setDropError(false)
        } else {
          setDropError(true)
        }
      },
      canDrop: ({ value, context }: LocalAssetDrop) => {
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

  const handleChangeTextField = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      if (value && (isValidFileName(value) || (acceptURLs && isValidHttpsUrl(value)))) {
        setPath(addBase(value))
        onChange && onChange(event)
        setDropError(false)
      } else {
        setDropError(true)
        setErrorMessage(
          acceptURLs && !isValidHttpsUrl(value) ? 'Provide a https URL or a valid file path' : 'File not valid.'
        )
      }
    },
    [addBase, setPath, setDropError, acceptURLs, onChange]
  )

  const handleChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file && isValidFileName(file.name)) {
        setDropError(false)
        const [newAsset] = await processAssets([file])
        const basePath = withAssetDir(DIRECTORY.SCENE)
        const assetPackageName = buildAssetPath(newAsset)
        const content = await convertAssetToBinary(newAsset)
        const newUploadFile = { ...uploadFile }
        newUploadFile[id.current] = file
        const assetPath = `${basePath}/${assetPackageName}/${newAsset.name}.${newAsset.extension}`
        dispatch(
          importAsset({
            content,
            basePath,
            assetPackageName,
            reload: true
          })
        )
        dispatch(updateUploadFile(newUploadFile))
        setPath(assetPath)
        onDrop && onDrop(assetPath)
      } else {
        setDropError(true)
      }
      if (inputRef.current) inputRef.current.value = ''
    },
    [inputRef, setPath, setDropError, uploadFile, onDrop]
  )

  const hasError = useMemo(() => {
    return error || dropError
  }, [error, dropError])

  return (
    <div className={cx('FileUpload Field', className)}>
      <div className={cx('FileUploadContainer', { error: hasError, disabled, droppeable: canDrop })}>
        <TextField
          id={id.current}
          className="FileUploadInput"
          ref={drop}
          placeholder={acceptURLs ? 'https://... or File Path' : 'File Path'}
          label={label}
          onChange={handleChangeTextField}
          value={removeBase(path)}
          error={!!value && hasError}
          disabled={disabled}
          drop={isHover}
          autoSelect
        />
        <input type="file" ref={inputRef} onChange={handleChange} accept={parseAccept(accept)} />
        {isEnabledFileExplorer && (
          <button className="FileUploadButton" onClick={handleClick} disabled={disabled}>
            <FolderIcon size={16} />
          </button>
        )}
      </div>
      {!!value && hasError && <Message text={errorMessage} type={MessageType.ERROR} />}
    </div>
  )
}

export default React.memo(FileUploadField)
