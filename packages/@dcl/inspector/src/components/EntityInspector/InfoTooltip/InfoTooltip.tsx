import { memo } from 'react'
import { VscQuestion as QuestionIcon } from 'react-icons/vsc'
import { Popup } from 'decentraland-ui/dist/components/Popup/Popup'
import { Props } from './types'
import './InfoTooltip.css'

export default memo<Props>(({ text, link, ...rest }) => {
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
      trigger={<QuestionIcon size={16} />}
      position="right center"
      on="hover"
      hideOnScroll
      hoverable
      {...rest}
    />
  )
})
