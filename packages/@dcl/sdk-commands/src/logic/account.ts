import { hexToBytes } from 'eth-connect'
import { ethSign, recoverAddressFromEthSignature } from '@dcl/crypto/dist/crypto'

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
    throw new CliError('Addresses should be 64 characters length.')
  }

  const pk = hexToBytes(privateKey)
  const msg = Math.random().toString()
  const signature = ethSign(pk, msg)
  const address: string = recoverAddressFromEthSignature(signature, msg)
  return { address, privateKey, publicKey: '0x' }
}
