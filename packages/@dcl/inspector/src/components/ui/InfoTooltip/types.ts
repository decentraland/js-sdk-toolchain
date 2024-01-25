import { PopupProps } from 'decentraland-ui/dist/components/Popup/Popup'

export type Props = {
  text: React.ReactNode
  link?: string
  type?: 'info' | 'help' | 'warning' | 'error'
} & PopupProps
