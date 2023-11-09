import { Component } from '../../../lib/sdk/components'
import { Props as DropdownProps } from '../Dropdown/types'

export type Props = Pick<DropdownProps, 'className' | 'disabled' | 'label' | 'value' | 'onChange'> & {
  components?: Component[]
}
