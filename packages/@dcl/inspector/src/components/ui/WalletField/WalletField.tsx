import React, { useCallback, useMemo, useState } from 'react'
import cx from 'classnames'
import { isAddress } from '../../../lib/logic/ethereum'
import { TextField } from '../TextField'
import type { Props } from './types'

export const WalletField: React.FC<Props> = ({ className, value, onChange, ...props }) => {
  const [wallet, setWallet] = useState<string>(value?.toString() ?? '')
  const [isFocused, setIsFocused] = useState<boolean>(false)

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target
      setWallet(value)
    },
    [onChange]
  )

  const handleFocus = useCallback(
    (_event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
    },
    [onChange]
  )

  const handleBlur = useCallback(
    (event: React.FocusEvent<HTMLInputElement>) => {
      const { value } = event.target
      if (isAddress(value)) {
        onChange && onChange(event)
      }
      setIsFocused(false)
    },
    [setWallet]
  )

  const formattedWallet = useMemo(() => {
    return isFocused ? wallet : isAddress(wallet) ? `${wallet.slice(0, 12)}...${wallet.slice(-8)}` : wallet
  }, [wallet, isFocused])

  const error = useMemo(() => {
    if (!!wallet && !isAddress(wallet.toString())) {
      return 'Not a valid Ethereum address.'
    }

    return undefined
  }, [wallet])

  return (
    <TextField
      className={cx('WalletField', className)}
      type="text"
      placeholder="Eth wallet address"
      value={formattedWallet}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      error={error}
      {...props}
    />
  )
}

export default React.memo(WalletField)
