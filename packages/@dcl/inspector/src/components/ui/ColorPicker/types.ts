import type { Props as TextFieldProps } from '../TextField/types'

export type Props = Omit<TextFieldProps, 'accept' | 'type' | 'onDrop'>
