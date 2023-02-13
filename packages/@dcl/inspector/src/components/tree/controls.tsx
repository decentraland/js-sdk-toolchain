import { TreeType } from '../../tree'

// TODO: temp component just to run some tests, rework it to be a context menu

interface ControlsProps {
  handleEdit: (e: React.MouseEvent) => void
  handleNewChild: (type: TreeType) => (e: React.MouseEvent) => void
  handleRemove: (e: React.MouseEvent) => void
  canCreate: boolean
  canDelete: boolean
}

export const Controls = ({
  handleEdit,
  handleNewChild,
  handleRemove,
  canCreate,
  canDelete,
}: ControlsProps) => {
  return (
    <>
      <button onClick={handleEdit}>Rename</button> {canCreate && (
        <>
        <button onClick={handleNewChild('directory')}>New Folder</button> <button onClick={handleNewChild('file')}>New File</button>
        </>
      )} {canDelete && <button onClick={handleRemove}>Delete</button>}
    </>
  )
}
