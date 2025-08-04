import { ChainId } from '@dcl/schemas';
import * as abis from '../abis';
import type { ContractData } from '../types';

export const dclRegistrar = {
  [ChainId.ETHEREUM_GOERLI]: {
    version: '1',
    abi: abis.DCLRegistrar,
    address: '0x6b8da2752827cf926215b43bb8e46fd7b9ddac35',
    name: 'DCLRegistrar',
    chainId: ChainId.ETHEREUM_GOERLI,
  },
  [ChainId.ETHEREUM_SEPOLIA]: {
    version: '1',
    abi: abis.DCLRegistrar,
    address: '0x7518456ae93eb98f3e64571b689c626616bb7f30',
    name: 'DCLRegistrar',
    chainId: ChainId.ETHEREUM_SEPOLIA,
  },
  [ChainId.ETHEREUM_MAINNET]: {
    version: '1',
    abi: abis.DCLRegistrar,
    address: '0x2a187453064356c898cae034eaed119e1663acb8',
    name: 'DCLRegistrar',
    chainId: ChainId.ETHEREUM_MAINNET,
  },
} as Record<ChainId, ContractData>;
