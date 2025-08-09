import { ChainId } from '@dcl/schemas/dist/dapps/chain-id';

export function isDev(chainId: ChainId): boolean {
  return chainId === ChainId.ETHEREUM_SEPOLIA;
}

export const REPORT_ISSUES_URL = 'https://decentraland.typeform.com/creatorhub';
export const FEEDBACK_URL = 'https://decentraland.typeform.com/creatorhub';
