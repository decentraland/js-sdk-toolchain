import React from 'react'
import { Menu, Item, Submenu } from 'react-contexify';
import { MdOutlineDriveFileRenameOutline as RenameIcon } from 'react-icons/md'
import { AiFillFileAdd as AddChildIcon, AiFillDelete as DeleteIcon} from 'react-icons/ai'

import { useContextMenu } from '../../../hooks/sdk/useContextMenu';

export interface Props {
  id: string
  components?: Map<number, string>
  enableAdd?: boolean
  enableEdit?: boolean
  enableRemove?: boolean
  onAddComponent: (componentId: string) => void
  onAddChild: () => void
  onEdit: () => void
  onRemove: () => void
}

// TODO: enumerate better the components we want to show...
const ENABLED_COMPONENTS_SET = new Set([
  'core::Transform',
  'core::Billboard',
  'core::TextShape',
  'core::MeshRenderer'
])

const getComponentName = (value: string) => (value.match(/[^:]*$/) || [])[0]
const isComponentEnabled = (value: string) => ENABLED_COMPONENTS_SET.has(value)

function ContextMenu({
  id,
  components = new Map(),
  enableAdd = true,
  enableEdit = true,
  enableRemove = true,
  onAddComponent,
  onAddChild,
  onEdit,
  onRemove,
}: Props) {
  const { handleAction } = useContextMenu()

  const someActionIsEnabled = enableAdd || enableEdit || enableRemove
  const shouldRender = someActionIsEnabled

  if (!shouldRender) return null

  const _components = Array.from(components.entries()).filter(([_, name]) => isComponentEnabled(name))

  return (
    <Menu id={id}>
      <Item hidden={!enableEdit} id="rename" onClick={handleAction(onEdit)}><RenameIcon /> Rename</Item>
      <Item hidden={!enableAdd} id="add-child" onClick={handleAction(onAddChild)}><AddChildIcon /> Add child</Item>
      <Item hidden={!enableRemove} id="delete" onClick={handleAction(onRemove)}><DeleteIcon /> Delete</Item>
      <Submenu hidden={!_components.length} label="Add component">
        {_components.map(([id, name]) => (
          <Item key={id} id={id.toString()} onClick={handleAction(onAddComponent)}>
            {getComponentName(name)}
          </Item>
        ))}
      </Submenu>
    </Menu>
  );
}

export default React.memo(ContextMenu)
