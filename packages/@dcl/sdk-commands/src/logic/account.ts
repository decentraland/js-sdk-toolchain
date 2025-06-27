import { hexToBytes } from 'eth-connect'
import { ethSign, recoverAddressFromEthSignature } from '@dcl/crypto/dist/crypto'
import i18next from 'i18next'

import { CliError } from './error'

export interface Wallet {
  address: string
  privateKey: string
  publicKey: string
}

export function createWallet(privateKey: string): Wallet {
  let length = 64

  if (privateKey.startsWith('0x')) {
    length = 66
  }

  if (privateKey.length !== length) {
    throw new CliError('ACCOUNT_INVALID_PRIVATE_KEY', i18next.t('errors.account.invalid_private_key'))
  }

  const pk = hexToBytes(privateKey)
  const msg = Math.random().toString()
  const signature = ethSign(pk, msg)
  const address: string = recoverAddressFromEthSignature(signature, msg)
  return { address, privateKey, publicKey: '0x' }
}
