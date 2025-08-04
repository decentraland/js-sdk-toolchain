import { ChainId } from '@dcl/schemas/dist/dapps/chain-id';
import * as abis from '../abis';
import type { ContractData } from '../types';

export const ensResolver = {
  [ChainId.ETHEREUM_SEPOLIA]: {
    version: '1',
    abi: abis.ENSResolver,
    address: '0x8FADE66B79cC9f707aB26799354482EB93a5B7dD',
    name: 'ENSResolver',
    chainId: ChainId.ETHEREUM_SEPOLIA,
  },
  [ChainId.ETHEREUM_MAINNET]: {
    version: '1',
    abi: abis.ENSResolver,
    address: '0x4976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41',
    name: 'ENSResolver',
    chainId: ChainId.ETHEREUM_MAINNET,
  },
} as Record<ChainId, ContractData>;
