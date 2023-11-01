import React, { useCallback } from 'react'
import cx from 'classnames'
import { IoAlertCircleOutline as AlertIcon } from 'react-icons/io5'
import { Props } from './types'
import './Option.css'

const Option: React.FC<Props> = (props) => {
  const {
    className,
    description,
    disabled,
    error,
    header,
    label,
    leftIcon,
    minWidth,
    rightIcon,
    secondaryText,
    selected,
    value,
    onClick
  } = props

  const renderLeftContent = useCallback(() => {
    if (leftIcon) {
      return (
        <div className="LeftContent">
          <span className="LeftIcon">{leftIcon}</span>
        </div>
      )
    }
  }, [leftIcon])

  const renderRightContent = useCallback(() => {
    if (error) {
      return (
        <div className="RightContent">
          <span className="RightIcon">
            <AlertIcon />
          </span>
        </div>
      )
    } else if (secondaryText) {
      return <div className="RightContent">{<label className="SecondaryText">{secondaryText}</label>}</div>
    } else if (rightIcon) {
      return (
        <div className="RightContent">
          <span className="RightIcon">{rightIcon}</span>
        </div>
      )
    }
  }, [secondaryText, rightIcon, error])

  const renderDescription = useCallback(() => {
    if (description) {
      return <div className="Description">{description}</div>
    }
  }, [description])

  const handleOnClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>, value: Props) => {
      onClick && onClick(e, value)
    },
    [onClick]
  )

  return (
    <div
      className={cx('OptionContainer', className, {
        disabled: !!disabled,
        error: !!error,
        header: !!header,
        selected: !!selected
      })}
      onClick={(e) => handleOnClick(e, props)}
    >
      {header ? (
        <div className="OptionHeader">{header}</div>
      ) : (
        <>
          <div className="OptionContent">
            {renderLeftContent()}
            <span className="Option" style={{ minWidth: minWidth }}>
              {label ?? value}
            </span>
            {renderRightContent()}
          </div>
          {renderDescription()}
        </>
      )}
    </div>
  )
}

export default React.memo(Option)