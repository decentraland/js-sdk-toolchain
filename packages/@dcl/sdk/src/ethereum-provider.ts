import { sendAsync } from '~system/EthereumController'
import { getEthereumProvider } from './internal/provider'
export { RPCSendableMessage } from './internal/provider'

export function createEthereumProvider() {
  return getEthereumProvider(sendAsync)
}
