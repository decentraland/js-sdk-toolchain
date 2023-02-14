import { MdOutlineDriveFileRenameOutline } from 'react-icons/md'
import { AiFillFolderAdd, AiFillFileAdd, AiFillDelete } from 'react-icons/ai'

import { TreeType } from '../../utils/tree'

// TODO: temp component just to run some tests, rework it to be a context menu

interface ControlsProps {
  handleEdit: (e: React.MouseEvent) => void
  handleNewChild: (type: TreeType) => (e: React.MouseEvent) => void
  handleRemove: (e: React.MouseEvent) => void
  canCreate: boolean
  canDelete: boolean
}

export const Controls = ({ handleEdit, handleNewChild, handleRemove, canCreate, canDelete }: ControlsProps) => {
  return (
    <>
      <button onClick={handleEdit}>
        <MdOutlineDriveFileRenameOutline />
      </button>{' '}
      {canCreate && (
        <>
          <button onClick={handleNewChild('directory')}>
            <AiFillFolderAdd />
          </button>
          <button onClick={handleNewChild('file')}>
            <AiFillFileAdd />
          </button>
        </>
      )}
      {canDelete && (
        <button onClick={handleRemove}>
          <AiFillDelete />
        </button>
      )}
    </>
  )
}
