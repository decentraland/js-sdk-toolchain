import { HTMLAttributes, memo } from 'react'
import { AiOutlinePlus as AddIcon } from 'react-icons/ai'
import './AddButton.css'

const AddButton = memo<HTMLAttributes<HTMLButtonElement>>((props) => {
  const { children, ...rest } = props
  return (
    <button className="AddButton" {...rest}>
      <AddIcon /> {children}
    </button>
  )
})

export default AddButton
