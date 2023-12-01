export type Props = {
  text?: React.ReactNode
  className?: string
  type?: MessageType
  icon?: boolean
}

export enum MessageType {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  QUESTION = 'question'
}
