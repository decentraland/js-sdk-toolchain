import { useCallback, useRef } from 'react'
import { MdLink as LinkIcon, MdLinkOff as LinkOffIcon } from 'react-icons/md'

import { Props } from './types'

import './Link.css'

export function Link({ field, getInputProps }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputProps = getInputProps(field, (e) => e.target.checked)
  const { value } = inputProps

  const handleClick = useCallback(() => {
    if (inputRef.current) inputRef.current.click()
  }, [getInputProps])

  const icon = !!value ? <LinkIcon /> : <LinkOffIcon />

  return (
    <>
      <input ref={inputRef} checked={!!value} {...inputProps} type="checkbox" style={{ display: 'none' }} />
      <div className="Link" onClick={handleClick}>
        {icon}
      </div>
    </>
  )
}
