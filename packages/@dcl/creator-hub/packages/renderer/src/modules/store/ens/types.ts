import { type ChainId } from '@dcl/schemas/dist/dapps/chain-id';
import { type Network } from '@dcl/schemas/dist/dapps/network';
import { type ProviderType } from '@dcl/schemas/dist/dapps/provider-type';

export type NetworkData = {
  mana: number;
  chainId: ChainId;
};

export type Networks = {
  [Network.ETHEREUM]: NetworkData;
  [Network.MATIC]: NetworkData;
};

export interface Wallet {
  address: string;
  networks: Networks;
  network: Network;
  chainId: ChainId;
  providerType: ProviderType;
}

export enum ENSProvider {
  DCL = 'dcl',
  ENS = 'ens',
}

export type ENS = {
  /** The NFT owner address */
  nftOwnerAddress: string;
  /** The ENS name owner address */
  ensOwnerAddress: string;
  /** The ENS name */
  name: string;
  /** The ENS subdomain name */
  subdomain: string;
  provider: ENSProvider;
  /** The NFT's token id that represents the ENS name */
  tokenId: string;
  resolver: string;
  content: string;

  ipfsHash?: string;

  // We'll need to change `landId` eventually so it can handle different content types. We could use:
  //   contentId?: string
  //   contentType?: ENSContent {LAND = 'land', (...)}
  landId?: string;

  worldStatus?: WorldStatus | null;

  ensAddressRecord?: string;
  userPermissions?: string[];
  size?: string;
};

export type ENSError = {
  message: string;
  code?: number;
  origin?: ENSOrigin;
};

export enum ENSOrigin {
  RESOLVER = 'Resolver',
  CONTENT = 'Content',
  ADDRESS = 'Address',
}

export type WorldStatus = {
  scene: {
    entityId: string | undefined;
  };
};

export enum USER_PERMISSIONS {
  DEPLOYMENT = 'deployment',
  STREAMING = 'streaming',
}

export type ContributableDomain = {
  name: string;
  user_permissions: USER_PERMISSIONS[];
  owner: string;
  size: string;
};

export type ContractData = {
  abi: object[];
  address: string;
  name: string;
  version: string;
  chainId: ChainId;
};
