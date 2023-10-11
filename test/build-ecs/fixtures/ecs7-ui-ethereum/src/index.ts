import { createEthereumProvider } from '@dcl/sdk/ethereum-provider'
import { setupUi } from './ui'

export function main() {
  void createEthereumProvider()
  setupUi()
}
