import React, { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import { IoIosArrowDown, IoIosArrowForward } from 'react-icons/io'
import { FiAlertTriangle as WarningIcon } from 'react-icons/fi'
import { VscTrash as RemoveIcon } from 'react-icons/vsc'
import { Button } from '../Button'
import { InfoTooltip } from '../ui/InfoTooltip'
import MoreOptionsMenu from '../EntityInspector/MoreOptionsMenu'

import { Props } from './types'

import './Container.css'

const Container: React.FC<React.PropsWithChildren<Props>> = (props) => {
  const [open, setOpen] = useState<boolean>(props.initialOpen ?? true)
  const Icon = open ? <IoIosArrowDown className="icon" /> : <IoIosArrowForward className="icon" />

  const renderIndicator = useCallback(() => {
    if (props.indicator) {
      return (
        <span className="indicator">
          {typeof props.indicator === 'boolean' ? (
            <WarningIcon />
          ) : typeof props.indicator === 'string' ? (
            <InfoTooltip text={props.indicator} type="warning" position="top center" />
          ) : (
            props.indicator
          )}
        </span>
      )
    }

    return null
  }, [props.indicator])

  const shouldRenderRightContent = useMemo(() => {
    return props.rightContent || props.onRemoveContainer
  }, [props])

  const renderRightContent = useCallback(() => {
    return (
      <div className="RightContent">
        {props.rightContent}
        {props.onRemoveContainer && (
          <MoreOptionsMenu>
            <Button className="RemoveButton" onClick={props.onRemoveContainer}>
              <RemoveIcon /> Delete Component
            </Button>
          </MoreOptionsMenu>
        )}
      </div>
    )
  }, [props])

  return (
    <div className={cx('Container', props.className, { open, border: props.border, 'with-gap': props.gap })}>
      {props.label && (
        <div className="title" onClick={() => setOpen(!open)}>
          {Icon}
          <span>{props.label}</span>
          {renderIndicator()}
          {shouldRenderRightContent && renderRightContent()}
        </div>
      )}
      {open && <div className="content">{props.children}</div>}
    </div>
  )
}

export default React.memo(Container)
