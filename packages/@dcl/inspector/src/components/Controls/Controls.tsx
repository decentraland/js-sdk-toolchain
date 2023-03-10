import { MdOutlineDriveFileRenameOutline } from 'react-icons/md'
import { AiFillFileAdd, AiFillDelete } from 'react-icons/ai'
import React from 'react'

// TODO: temp component just to run some tests, rework it to be a context menu

interface ControlsProps {
  handleEdit: (e: React.MouseEvent) => void
  handleNewChild: (e: React.MouseEvent) => void
  handleRemove: (e: React.MouseEvent) => void
}

const Controls = ({ handleEdit, handleNewChild, handleRemove }: ControlsProps) => {
  return (
    <>
      <button onClick={handleEdit}>
        <MdOutlineDriveFileRenameOutline />
      </button>{' '}
      <button onClick={handleNewChild}>
        <AiFillFileAdd />
      </button>
      <button onClick={handleRemove}>
        <AiFillDelete />
      </button>
    </>
  )
}

export default React.memo(Controls)
