import { captureException } from '@sentry/electron/renderer';
import { ErrorBase } from '../../../shared/types/error';

export const DEPLOY_URLS = {
  WORLDS: 'https://worlds-content-server.decentraland.org',
  TEST: 'https://peer-testing.decentraland.org',
  DEV_WORLDS: 'https://worlds-content-server.decentraland.zone',
  CATALYST_SERVER: 'https://peer.decentraland.org',
  DEV_CATALYST_SERVER: 'https://peer.decentraland.zone',
  ASSET_BUNDLE_REGISTRY: 'https://asset-bundle-registry.decentraland.org',
  DEV_ASSET_BUNDLE_REGISTRY: 'https://asset-bundle-registry.decentraland.zone',
};

export type File = {
  name: string;
  size: number;
};

export type Info = {
  baseParcel: string;
  debug: boolean;
  description: string;
  isPortableExperience: boolean;
  isWorld: boolean;
  parcels: string[];
  rootCID: string;
  skipValidations: boolean;
  title: string;
};

export const STATUS_VALUES = ['idle', 'pending', 'complete', 'failed'] as const;

export type Status = (typeof STATUS_VALUES)[number];

export type DeploymentComponentsStatus = {
  catalyst: Status;
  assetBundle: Status;
  lods: Status;
};

export type AssetBundleRegistryResponse = {
  complete: boolean;
  catalyst: string;
  assetBundles: {
    mac: string;
    windows: string;
  };
  lods: {
    mac: string;
    windows: string;
  };
};

export type ErrorName =
  | 'MAX_RETRIES'
  | 'FETCH_STATUS'
  | 'CATALYST_SERVERS_EXHAUSTED'
  | 'DEPLOYMENT_NOT_FOUND'
  | 'DEPLOYMENT_FAILED'
  | 'INVALID_URL'
  | 'INVALID_IDENTITY'
  | 'MAX_FILE_SIZE_EXCEEDED';

export class DeploymentError extends ErrorBase<ErrorName> {
  constructor(
    public name: ErrorName,
    public status: DeploymentComponentsStatus,
    public error?: Error,
  ) {
    super(name, error?.message);
    // Report the error to Sentry
    captureException(error || this, {
      tags: {
        source: 'deployment',
        errorType: name,
      },
      fingerprint: ['deployment-error', name],
    });
  }
}

export const isDeploymentError = (
  error: unknown,
  type: ErrorName | ErrorName[] | '*',
): error is DeploymentError =>
  error instanceof DeploymentError &&
  (Array.isArray(type) ? type.includes(error.name) : type === '*' || error.name === type);
