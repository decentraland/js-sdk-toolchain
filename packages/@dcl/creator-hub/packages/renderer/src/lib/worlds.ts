import type { AuthIdentity } from '@dcl/crypto';
import { localStorageGetIdentity } from '@dcl/single-sign-on-client';
import fetch from 'decentraland-crypto-fetch';
import type { ContributableDomain } from '../modules/store/ens/types';
import { DEPLOY_URLS } from './deploy';

export type WorldDeployment = {
  id: string;
  timestamp: number;
  version: string;
  type: string;
  pointers: string[];
  content: Content[];
  metadata: Metadata;
};

export type Content = {
  file: string;
  hash: string;
};

export type Metadata = {
  allowedMediaHostnames: any[];
  owner: string;
  main: string;
  contact: Contact;
  display: Display;
  tags: string[];
  scene: Scene;
  ecs7: boolean;
  runtimeVersion: string;
  source: Source;
  worldConfiguration: WorldConfiguration;
};

export type Contact = {
  name: string;
  email: string;
};

export type Display = {
  title: string;
  favicon: string;
  navmapThumbnail: string;
};

export type Scene = {
  base: string;
  parcels: string[];
};

export type Source = {
  version: number;
  origin: string;
  point: Point;
  projectId: string;
  layout: Layout;
};

export type Layout = {
  rows: number;
  cols: number;
};

export type Point = {
  x: number;
  y: number;
};

export type WorldConfiguration = {
  name: string;
};

export type WorldInfo = {
  healthy: boolean;
  configurations: {
    networkId: number;
    globalScenesUrn: string[];
    scenesUrn: string[];
    cityLoaderContentServer: string;
  };
  content: {
    healthy: boolean;
    publicUrl: string;
  };
  lambdas: {
    healthy: boolean;
    publicUrl: string;
  };
};

export type WorldsWalletStats = {
  wallet: string;
  dclNames: {
    name: string;
    size: string;
  }[];
  ensNames: {
    name: string;
    size: string;
  }[];
  usedSpace: string;
  maxAllowedSpace: string;
  blockedSince?: string;
};

export enum WorldPermissionType {
  Unrestricted = 'unrestricted',
  SharedSecret = 'shared-secret',
  NFTOwnership = 'nft-ownership',
  AllowList = 'allow-list',
}

export type UnrestrictedPermissionSetting = {
  type: WorldPermissionType.Unrestricted;
};

export type AllowListPermissionSetting = {
  type: WorldPermissionType.AllowList;
  wallets: string[];
};

export type WorldPermissions = {
  deployment: AllowListPermissionSetting;
  access: AllowListPermissionSetting | UnrestrictedPermissionSetting;
  streaming: AllowListPermissionSetting;
};

export type WorldPermissionsResponse = {
  permissions: WorldPermissions;
};

export enum WorldPermissionNames {
  Deployment = 'deployment',
  Access = 'access',
  Streaming = 'streaming',
}

export class Worlds {
  private url = DEPLOY_URLS.WORLDS;

  constructor(isDev: boolean) {
    if (isDev) {
      this.url = DEPLOY_URLS.DEV_WORLDS;
    }
  }

  private withIdentity(address: string): AuthIdentity {
    const identity = localStorageGetIdentity(address);
    if (!identity) {
      throw new Error('No identity found');
    }
    return identity;
  }

  public async fetchWorld(name: string) {
    try {
      const result = await fetch(`${this.url}/entities/active`, {
        method: 'POST',
        body: JSON.stringify({
          pointers: [name],
        }),
      });
      if (result.ok) {
        const json = await result.json();
        return json as WorldDeployment[];
      } else {
        return null;
      }
    } catch (_) {
      /* empty */
    }

    return null;
  }

  public fetchWalletStats = async (address: string) => {
    const result = await fetch(`${this.url}/wallet/${address}/stats`);
    if (result.ok) {
      const json = await result.json();
      return json as WorldsWalletStats;
    } else {
      return null;
    }
  };

  public getPermissions = async (worldName: string) => {
    const result = await fetch(`${this.url}/world/${worldName}/permissions`);
    if (result.ok) {
      const json: WorldPermissionsResponse = await result.json();
      return json.permissions;
    } else {
      return null;
    }
  };

  public postPermissionType = async (
    address: string,
    worldName: string,
    worldPermissionNames: WorldPermissionNames,
    worldPermissionType: WorldPermissionType,
  ) => {
    const result = await fetch(
      `${this.url}/world/${worldName}/permissions/${worldPermissionNames}`,
      {
        method: 'POST',
        metadata: {
          type: worldPermissionType,
        },
        identity: this.withIdentity(address),
      },
    );
    return result.status === 204;
  };

  public putPermissionType = async (
    address: string,
    worldName: string,
    worldPermissionNames: WorldPermissionNames,
  ) => {
    const result = await fetch(
      `${this.url}/world/${worldName}/permissions/${worldPermissionNames}/${address}`,
      {
        method: 'PUT',
        identity: this.withIdentity(address),
      },
    );
    return result.status === 204;
  };

  public deletePermissionType = async (
    address: string,
    worldName: string,
    worldPermissionNames: WorldPermissionNames,
  ) => {
    const result = await fetch(
      `${this.url}/world/${worldName}/permissions/${worldPermissionNames}/${address}`,
      {
        method: 'DELETE',
        identity: this.withIdentity(address),
      },
    );
    return result.status === 204;
  };

  public fetchContributableDomains = async (address: string) => {
    const result = await fetch(`${this.url}/wallet/contribute`, {
      method: 'GET',
      identity: this.withIdentity(address),
    });

    if (result.ok) {
      const json: { domains: ContributableDomain[] } = await result.json();
      return json.domains;
    } else {
      throw new Error('Error while fetching contributable domains');
    }
  };
}
