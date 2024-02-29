import React, { useCallback } from 'react'
import cx from 'classnames'
import { IoAlertCircleOutline as AlertIcon, IoCheckmark as CheckIcon } from 'react-icons/io5'
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
    leftContent,
    minWidth,
    rightIcon,
    secondaryText,
    selected,
    value,
    isField,
    onClick
  } = props

  const renderSelectedOption = useCallback(() => {
    return (
      isField && <div className="SelectedContent">{selected && <CheckIcon className="SelectedIcon" size={16} />}</div>
    )
  }, [selected, isField])

  const renderLeftContent = useCallback(() => {
    if (leftIcon) {
      return (
        <div className="LeftContent">
          <span className="LeftIcon">{leftIcon}</span>
        </div>
      )
    } else if (leftContent) {
      return <div className="LeftContent">{leftContent}</div>
    }
  }, [leftIcon, leftContent])

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
            {renderSelectedOption()}
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
