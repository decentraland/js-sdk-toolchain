import { ChainId } from '@dcl/schemas/dist/dapps/chain-id';
import * as abis from '../abis';
import type { ContractData } from '../types';

export const ens = {
  [ChainId.ETHEREUM_SEPOLIA]: {
    version: '1',
    abi: abis.ENS,
    address: '0x00000000000c2e074ec69a0dfb2997ba6c7d2e1e',
    name: 'ENS',
    chainId: ChainId.ETHEREUM_SEPOLIA,
  },
  [ChainId.ETHEREUM_MAINNET]: {
    version: '1',
    abi: abis.ENS,
    address: '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
    name: 'ENS',
    chainId: ChainId.ETHEREUM_MAINNET,
  },
} as Record<ChainId, ContractData>;
