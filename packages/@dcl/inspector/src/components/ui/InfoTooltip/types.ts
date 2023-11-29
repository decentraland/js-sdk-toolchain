import { PopupProps } from 'decentraland-ui/dist/components/Popup/Popup'

export type Props = {
  text: React.ReactNode
  link?: string
  trigger?: React.ReactNode
  type?: 'info' | 'help' | 'warning' | 'error'
} & PopupProps
