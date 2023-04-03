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
import { getEthereumProvider } from './internal/provider'
export { RPCSendableMessage } from './internal/provider'

export function createEthereumProvider() {
  return getEthereumProvider(sendAsync)
}
