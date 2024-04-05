import { HTMLAttributes, memo } from 'react'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { Button } from '../../Button'

const RemoveButton = memo<HTMLAttributes<HTMLButtonElement>>((props) => {
  const { children, ...rest } = props
  return (
    <Button className="RemoveButton" {...rest}>
      <RemoveIcon /> {children}
    </Button>
  )
})

export default RemoveButton
