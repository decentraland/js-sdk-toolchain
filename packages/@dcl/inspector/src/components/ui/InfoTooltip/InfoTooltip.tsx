import { memo, useCallback } from 'react'
import { VscQuestion as QuestionIcon } from 'react-icons/vsc'
import { AiOutlineInfoCircle as InfoIcon } from 'react-icons/ai'
import { FiAlertTriangle as WarningIcon } from 'react-icons/fi'
import { Popup } from 'decentraland-ui/dist/components/Popup/Popup'
import { Props } from './types'
import './InfoTooltip.css'

export default memo<Props>(({ text, link, trigger, type = 'info', ...rest }) => {
  const renderIconTrigger = useCallback(() => {
    switch (type) {
      case 'info':
        return <InfoIcon size={16} />
      case 'warning':
        return <WarningIcon size={16} />
      default:
        return <QuestionIcon size={16} />
    }
  }, [type])

  return (
    <Popup
      className="InfoTooltip"
      content={
        <>
          {text}{' '}
          {link ? (
            <a href={link} target="_blank">
              Learn more
            </a>
          ) : null}
        </>
      }
      trigger={trigger ?? renderIconTrigger()}
      position="right center"
      on="hover"
      hideOnScroll
      hoverable
      {...rest}
    />
  )
})
