import equal from 'fast-deep-equal';
import { getCatalystServersFromCache } from 'dcl-catalyst-client/dist/contracts-snapshots';
import { type SerializedError } from '@reduxjs/toolkit';
import { type AuthChain, Authenticator } from '@dcl/crypto';
import { ChainId } from '@dcl/schemas';
import type { AuthIdentity } from 'decentraland-crypto-fetch';

import { t } from '/@/modules/store/translation/utils';
import { minutes, seconds } from '/shared/time';
import { delay } from '/shared/utils';
import {
  DEPLOY_URLS,
  type Info,
  type File,
  type AssetBundleRegistryResponse,
  type Status,
  type DeploymentComponentsStatus,
  STATUS_VALUES,
  DeploymentError,
} from '/@/lib/deploy';

export const MAX_FILE_SIZE_BYTES = 50 * 1e6; // 50MB defined in sdk-commands...

export const getDeploymentUrl = (publishPort: number) => {
  const port = import.meta.env.VITE_CLI_DEPLOY_PORT || publishPort;
  return port ? `http://localhost:${port}/api` : null;
};

export const fetchFiles = async (url: string): Promise<File[]> => {
  if (!url) throw new Error('Invalid URL');
  const resp = await fetch(`${url}/files`);
  if (!resp.ok) throw new Error('Failed to fetch files');
  return resp.json();
};

export const fetchInfo = async (url: string): Promise<Info> => {
  if (!url) throw new Error('Invalid URL');
  const resp = await fetch(`${url}/info`);
  if (!resp.ok) throw new Error('Failed to fetch info');
  return resp.json();
};

export function getInvalidFiles(files: File[]) {
  return files.filter(file => file.size > MAX_FILE_SIZE_BYTES).map(file => file.name);
}

export const deploy = async (
  url: string,
  payload: {
    address: string;
    authChain: AuthChain;
    chainId: ChainId;
  },
) => {
  const resp = await fetch(`${url}/deploy`, {
    method: 'post',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const data = await resp.json();
    let error = data.message;
    if (/Response was/.test(error)) {
      try {
        error = error.match(/\["(.*?)"\]/)?.[1] ?? error;
      } catch (e) {
        // Keep original error if parsing fails
      }
    }
    throw new Error(error);
  }
};

export const getInitialDeploymentStatus = (
  isWorld: boolean = false,
): DeploymentComponentsStatus => ({
  catalyst: 'idle',
  assetBundle: 'idle',
  lods: isWorld ? 'complete' : 'idle', // Auto-complete for worlds
});

export const retryDelayInMs = seconds(10);
// Estimated time as of 5/12/2024 for a full deployment is around 60 minutes.
export const maxRetries = minutes(60) / retryDelayInMs; // Total number of retries calculated based on a X-minute retry window

export const AUTH_CHAIN_HEADER_PREFIX = 'x-identity-auth-chain-';
export const AUTH_TIMESTAMP_HEADER = 'x-identity-timestamp';
export const AUTH_METADATA_HEADER = 'x-identity-metadata';

export function getAuthHeaders(
  method: string,
  path: string,
  chainProvider: (payload: string) => AuthChain,
): Record<string, string> {
  const timestamp = Date.now().toString();
  const metadata = JSON.stringify({}); // needed for the fetch to work...
  const payloadToSign = `${method.toLowerCase()}:${path.toLowerCase()}:${timestamp}:${metadata}`;

  const chain = chainProvider(payloadToSign);
  const headers = chain.reduce<Record<string, string>>((acc, link, index) => {
    acc[`${AUTH_CHAIN_HEADER_PREFIX}${index}`] = JSON.stringify(link);
    return acc;
  }, {});

  return {
    ...headers,
    [AUTH_TIMESTAMP_HEADER]: timestamp,
    [AUTH_METADATA_HEADER]: metadata,
  };
}

/**
 * Validates a status string against known values.
 *
 * @param status - The status string to validate.
 * @returns A valid `Status` or `failed` if invalid.
 */
export function validateStatus(status: string): Status {
  return STATUS_VALUES.includes(status as Status) ? (status as Status) : 'failed';
}

/**
 * Derives an overall deployment status from different statuses.
 *
 * @param statuses - The deployment statuses.
 * @returns An overall `Status`.
 */
export function deriveOverallStatus(statuses: Record<string, string>): Status {
  const _statuses: Set<Status> = new Set(Object.values(statuses) as Status[]);
  if (_statuses.has('failed')) return 'failed';
  if (_statuses.has('pending')) return 'pending';
  if (_statuses.has('complete')) return 'complete';
  return 'idle';
}

/**
 * Cleans up a `DeploymentStatus` object by resetting any 'pending' statuses to 'idle'.
 *
 * This function ensures that any deployment step stuck in a 'pending' state is treated
 * as 'idle' to indicate that it hasn't started or needs to be retried.
 *
 * @param status - The `DeploymentStatus` object containing the current statuses of deployment steps.
 * @returns A new `DeploymentStatus` object where all 'pending' statuses are replaced with 'idle'.
 */
export function cleanPendingsFromDeploymentStatus(
  status: DeploymentComponentsStatus,
): DeploymentComponentsStatus {
  return Object.fromEntries(
    Object.entries(status).map(([step, currentStatus]) => [
      step,
      currentStatus === 'pending' ? 'idle' : currentStatus,
    ]),
  ) as DeploymentComponentsStatus;
}

/**
 * Fetches the deployment status for a given scene.
 *
 * @param info - The scene info.
 * @param identity - The authentication identity for signing requests.
 * @returns A promise resolving to the deployment status.
 */
export async function fetchDeploymentStatus(
  info: Info,
  identity: AuthIdentity,
): Promise<DeploymentComponentsStatus> {
  const { rootCID: sceneId, isWorld } = info;
  const method = 'get';
  const path = `/entities/status/${sceneId}`;
  const url = new URL(path, DEPLOY_URLS.ASSET_BUNDLE_REGISTRY);
  const headers = getAuthHeaders(method, url.pathname, payload =>
    Authenticator.signPayload(identity, payload),
  );

  const response = await fetch(url, { method, headers });

  if (!response.ok) throw new Error(`Error fetching deployment status: ${response.status}`);

  const json = (await response.json()) as AssetBundleRegistryResponse;

  return {
    catalyst: validateStatus(json.catalyst),
    assetBundle: deriveOverallStatus(json.assetBundles),
    lods: isWorld ? 'complete' : deriveOverallStatus(json.lods), // Skip lods for worlds
  };
}

/**
 * Periodically checks the deployment status and updates the caller with changes.
 * Retries the status check up to a maximum number of attempts or until the deployment succeeds.
 *
 * @param maxRetries - The maximum number of retries before considering the deployment a failure.
 * @param retryDelayInMs - The delay in milliseconds between consecutive retries.
 * @param fetchStatus - A promise function that resolves to a DeploymentStatus triggered on every retry.
 * @param onChange - A callback function triggered whenever the deployment status changes.
 * @param abort - A function that returns `true` if the status check should be aborted.
 * @param initialStatus - The initial deployment status to start with (defaults to 'idle' for every step).
 * @returns A promise resolving to the deployment status.
 * @throws {DeploymentError} Throws an error if the maximum retries are reached without success.
 */
export async function checkDeploymentStatus(
  maxRetries: number,
  retryDelayInMs: number,
  fetchStatus: () => Promise<DeploymentComponentsStatus>,
  onChange: (status: DeploymentComponentsStatus) => void,
  abort: () => boolean,
  initialStatus: DeploymentComponentsStatus = getInitialDeploymentStatus(),
): Promise<DeploymentComponentsStatus> {
  let currentStatus = initialStatus;
  let retries = 0;
  let error: Error | undefined = undefined;

  function _onChange(status: DeploymentComponentsStatus) {
    onChange(status);
    currentStatus = status;
  }

  while (retries < maxRetries) {
    try {
      if (abort()) {
        console.log('Deployment status check aborted...');
        return currentStatus;
      }
      const status = await fetchStatus();
      if (!equal(currentStatus, status)) _onChange(status);
    } catch (e: any) {
      error = new DeploymentError('FETCH_STATUS', currentStatus, e);
      console.error(error);
    }

    retries++;

    // return if all components of the deployment are successful
    const allSuccessful = Object.values(currentStatus).every($ => $ === 'complete');
    if (allSuccessful) {
      console.log('Deployment success!');
      return currentStatus;
    }

    if (retries < maxRetries) {
      console.log(
        `Attempt ${retries + 1}/${maxRetries} failed. Retrying in ${retryDelayInMs}ms...`,
      );
      await delay(retryDelayInMs);
    }
  }

  // if maximum retries are reached, log the error and throw
  const maxRetriesError = new DeploymentError('MAX_RETRIES', currentStatus, error);
  console.error(maxRetriesError);
  throw maxRetriesError;
}

/**
 * Checks if the deployment is nearing completion based on a given percentage threshold.
 *
 * This function evaluates the `DeploymentStatus` object to determine whether the proportion
 * of steps with a 'complete' status meets or exceeds the specified threshold (default: 60%).
 *
 * @param status - The `DeploymentStatus` object containing the current statuses of deployment steps.
 * @param percentage - The completion threshold as a decimal (e.g., `0.6` for 60%). Defaults to 0.6.
 * @returns `true` if the proportion of completed steps is greater than or equal to the threshold; otherwise, `false`.
 */
export function checkDeploymentCompletion(
  status: DeploymentComponentsStatus,
  percentage: number = 0.6,
): boolean {
  const statuses = Object.values(status);
  const total = statuses.length;
  if (total === 0) return false;
  const completedCount = statuses.filter(value => value === 'complete').length;
  return completedCount / total >= percentage;
}

export function getCatalystServers(chainId: ChainId) {
  const network = chainId === ChainId.ETHEREUM_SEPOLIA ? 'sepolia' : 'mainnet';
  return getCatalystServersFromCache(network);
}

export function getAvailableCatalystServer(triedServers: Set<string>, chainId: ChainId): string {
  const availableServers = [];

  for (const server of getCatalystServers(chainId)) {
    if (!triedServers.has(server.address)) {
      availableServers.push(server.address);
    }
  }

  if (availableServers.length === 0) {
    throw new Error('No available catalyst servers to try');
  }

  const randomIndex = Math.floor(Math.random() * availableServers.length);
  return availableServers[randomIndex];
}

export function translateError(error: SerializedError) {
  switch (error.name) {
    case 'INVALID_URL':
      return t('modal.publish_project.deploy.deploying.errors.invalid_url');
    case 'INVALID_IDENTITY':
      return t('modal.publish_project.deploy.deploying.errors.invalid_identity');
    case 'MAX_RETRIES':
      return t('modal.publish_project.deploy.deploying.errors.max_retries');
    case 'FETCH_STATUS':
      return t('modal.publish_project.deploy.deploying.errors.fetch_status');
    case 'CATALYST_SERVERS_EXHAUSTED':
      return t('modal.publish_project.deploy.deploying.errors.catalyst');
    case 'DEPLOYMENT_NOT_FOUND':
      return t('modal.publish_project.deploy.deploying.errors.not_found');
    case 'DEPLOYMENT_FAILED':
      return t('modal.publish_project.deploy.deploying.errors.failed');
    case 'MAX_FILE_SIZE_EXCEEDED':
      return t('modal.publish_project.deploy.deploying.errors.max_file_size_exceeded', {
        maxFileSizeInMb: MAX_FILE_SIZE_BYTES / 1e6,
      });
    default:
      return t('modal.publish_project.deploy.deploying.errors.unknown');
  }
}
