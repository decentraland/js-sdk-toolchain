/**
 * This module is exposed by the sdk via `@dcl/sdk/etherum-provider`
 *

* @example
 * ```tsx
 * import { createEthereumProvider } from '@dcl/sdk/ethereum-provider'
 * import { ethers } from 'ethers'

 * const provider = new ethers.providers.Web3Provider(createEthereumProvider() as any)
 * ```
 *
 * @module Etherum Provider
 *
 */

import { sendAsync } from '~system/EthereumController'
import { getEthereumProvider } from '../internal/provider'
import { polyfillTextEncoder } from './text-encoder'

/**
 * Etherum Provider
 * @public
 */
export function createEthereumProvider() {
  polyfillTextEncoder()
  return getEthereumProvider(sendAsync)
}

export { RPCSendableMessage } from '../internal/provider'
