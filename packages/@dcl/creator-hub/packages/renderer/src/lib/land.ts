import { fromUnixTime } from 'date-fns/fromUnixTime';

// TheGraph has a limit of a maximum of 1000 results per entity per query
const MAX_RESULTS = 1000;

const SEPARATOR = ',';

export const coordsToId = (x: string | number, y: string | number) => `${x}${SEPARATOR}${y}`;

const fromParcel = (parcel: ParcelFields, role: RoleType) => {
  const id = coordsToId(parcel.x, parcel.y);

  const result: Land = {
    id,
    tokenId: parcel.tokenId,
    name: (parcel.data && parcel.data.name) || 'Parcel',
    type: LandType.PARCEL,
    roles: [role],
    role,
    description: (parcel.data && parcel.data.description) || null,
    x: parseInt(parcel.x, 10),
    y: parseInt(parcel.y, 10),
    owner: parcel.owner.address,
    operators: [],
  };

  if (parcel.updateOperator) {
    result.operators.push(parcel.updateOperator);
  }

  return result;
};

const fromEstate = (estate: EstateFields, role: RoleType) => {
  const id = estate.id;

  const result: Land = {
    id,
    tokenId: id,
    name: (estate.data && estate.data.name) || `Estate ${id}`,
    type: LandType.ESTATE,
    roles: [role],
    role,
    description: (estate.data && estate.data.description) || null,
    size: estate.size,
    parcels: estate.parcels.map(parcel => ({
      x: parseInt(parcel.x, 10),
      y: parseInt(parcel.y, 10),
      id: coordsToId(parcel.x, parcel.y),
    })),
    owner: estate.owner.address,
    operators: [],
  };

  if (estate.updateOperator) {
    result.operators.push(estate.updateOperator);
  }

  return result;
};

function isMax(result: LandQueryResult) {
  // true if any result length matches the MAX_RESULTS constant
  return Object.values(result).some(value => value.length >= MAX_RESULTS);
}

function isZero(addr: string) {
  return /^0x(0)+$/.test(addr);
}

export const parcelFields = () => `
  fragment parcelFields on Parcel {
    x
    y
    tokenId
    owner {
      address
    }
    updateOperator
    data {
      name
      description
    }
  }
`;

export const estateFields = () => `
  fragment estateFields on Estate {
    id
    owner {
      address
    }
    updateOperator
    size
    parcels(first: 1000) {
      x
      y
      tokenId
    }
    data {
      name
      description
    }
  }
`;

const getLandQuery = (skip = 0) => `
  query Land($address: Bytes, $tenantTokenIds: [String!], $lessorTokenIds: [String!]) {
    tenantParcels: parcels(first: ${MAX_RESULTS}, skip: ${skip}, where: { tokenId_in: $tenantTokenIds }) {
      ...parcelFields
    }
    tenantEstates: estates(first: ${MAX_RESULTS}, skip: ${skip}, where: { id_in: $tenantTokenIds }) {
      ...estateFields
    }
    lessorParcels: parcels(first: ${MAX_RESULTS}, skip: ${skip}, where: { tokenId_in: $lessorTokenIds }) {
      ...parcelFields
    }
    lessorEstates: estates(first: ${MAX_RESULTS}, skip: ${skip}, where: { id_in: $lessorTokenIds }) {
      ...estateFields
    }
    ownerParcels: parcels(first: ${MAX_RESULTS}, skip: ${skip}, where: { estate: null, owner: $address }) {
      ...parcelFields
    }
    ownerEstates: estates(first: ${MAX_RESULTS}, skip: ${skip}, where: { owner: $address }) {
      ...estateFields
    }
    updateOperatorParcels: parcels(first: ${MAX_RESULTS}, skip: ${skip}, where: { updateOperator: $address }) {
      ...parcelFields
    }
    updateOperatorEstates: estates(first: ${MAX_RESULTS}, skip: ${skip}, where: { updateOperator: $address }) {
      ...estateFields
    }
    ownerAuthorizations: authorizations(first: ${MAX_RESULTS}, skip: ${skip}, where: { owner: $address, type: "UpdateManager" }) {
      operator
      isApproved
      tokenAddress
    }
    operatorAuthorizations: authorizations(first: ${MAX_RESULTS}, skip: ${skip}, where: { operator: $address, type: "UpdateManager" }) {
      owner {
        address
        parcels(first: ${MAX_RESULTS}, skip: ${skip}, where: { estate: null }) {
          ...parcelFields
        }
        estates(first: ${MAX_RESULTS}) {
          ...estateFields
        }
      }
      isApproved
      tokenAddress
    }
  }
  ${parcelFields()}
  ${estateFields()}
`;

export enum LandType {
  PARCEL = 'parcel',
  ESTATE = 'estate',
}

export enum RoleType {
  OWNER = 1,
  LESSOR = 2,
  TENANT = 3,
  OPERATOR = 4,
}

export type Land = {
  id: string;
  tokenId: string;
  type: LandType;
  roles: RoleType[];
  role: RoleType;
  x?: number;
  y?: number;
  parcels?: { x: number; y: number; id: string }[];
  size?: number;
  name: string;
  description: string | null;
  owner: string;
  operators: string[];
};

export type ParcelFields = {
  x: string;
  y: string;
  tokenId: string;
  owner: {
    address: string;
  };
  updateOperator: string | null;
  data: {
    name: string | null;
    description: string | null;
  } | null;
};

export type EstateFields = {
  id: string;
  owner: {
    address: string;
  };
  updateOperator: string | null;
  size: number;
  parcels: Pick<ParcelFields, 'x' | 'y' | 'tokenId'>[];
  data: {
    name: string | null;
    description: string | null;
  } | null;
};

export type Authorization = {
  address: string;
  type: LandType;
};

export type RentalFields = {
  id: string;
  contractAddress: string;
  tokenId: string;
  lessor: string;
  tenant: string;
  operator: string;
  startedAt: string;
  endsAt: string;
};

export type Rental = {
  id: string;
  type: LandType;
  tokenId: string;
  lessor: string;
  tenant: string;
  operator: string;
  startedAt: Date;
  endsAt: Date;
};

export type LandQueryResult = {
  tenantParcels: ParcelFields[];
  tenantEstates: EstateFields[];
  lessorParcels: ParcelFields[];
  lessorEstates: EstateFields[];
  ownerParcels: ParcelFields[];
  ownerEstates: EstateFields[];
  updateOperatorParcels: ParcelFields[];
  updateOperatorEstates: EstateFields[];
  ownerAuthorizations: { operator: string; isApproved: boolean; tokenAddress: string }[];
  operatorAuthorizations: {
    owner: { address: string; parcels: ParcelFields[]; estates: EstateFields[] };
    isApproved: boolean;
    tokenAddress: string;
  }[];
};

export enum Color {
  NEON_BLUE = '#00D3FF',
  SUMMER_RED = '#FF2D55',
  VOID = '#16141A',
  LUISXVI_VIOLET = '#A524B3',
  IDONTFEELTHATWELL = '#F3F2F5',
  SHADOWS = '#242129',
  NIGHT_TIME = '#691FA9',
  BLUISH_STEEL = '#676370',
  INNOCENCE = '#FFFFFF',
  CANDY_PURPLE = '#C640CD',
  SUNISH = '#FFBC5B',
  MILLENIAL_ORANGE = '#FC9965',
  OJ_NOT_SIMPSON = '#FF7439',
  DARK = '#18141A',
}

export const colorByRole: Record<RoleType, string> = {
  [RoleType.OWNER]: Color.SUMMER_RED,
  [RoleType.LESSOR]: Color.MILLENIAL_ORANGE,
  [RoleType.OPERATOR]: Color.LUISXVI_VIOLET,
  [RoleType.TENANT]: Color.SUMMER_RED,
};

export class Lands {
  private subgraph = 'https://subgraph.decentraland.org/land-manager';
  private LAND_REGISTRY_ADDRESS = '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d';
  private ESTATE_REGISTRY_ADDRESS = '0x959e104e1a4db6317fa58f8295f586e1a978c297';

  constructor(isDev: boolean) {
    if (isDev) {
      this.subgraph =
        'https://api.studio.thegraph.com/query/49472/land-manager-sepolia/version/latest';
      this.LAND_REGISTRY_ADDRESS = '0x42f4ba48791e2de32f5fbf553441c2672864bb33';
      this.ESTATE_REGISTRY_ADDRESS = '0x369a7fbe718c870c79f99fb423882e8dd8b20486';
    }
  }

  fetchLand = async (
    _address: string,
    tenantTokenIds: string[] = [],
    lessorTokenIds: string[] = [],
    skip = 0,
  ): Promise<[Land[], Authorization[]]> => {
    const address = _address.toLowerCase();

    const response: Response = await fetch(this.subgraph, {
      method: 'POST',
      body: JSON.stringify({
        query: getLandQuery(skip),
        variables: {
          address,
          tenantTokenIds,
          lessorTokenIds,
        },
      }),
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
      },
    });

    const { data }: { data: LandQueryResult } = await response.json();

    const lands: Land[] = [];
    const landUpdateManagers = new Set<string>();
    const estateUpdateManagers = new Set<string>();

    // parcels and estates that I own
    for (const parcel of data.ownerParcels) {
      lands.push(fromParcel(parcel, RoleType.OWNER));
    }
    for (const estate of data.ownerEstates) {
      lands.push(fromEstate(estate, RoleType.OWNER));
    }

    // parcels and estates that I operate
    for (const parcel of data.updateOperatorParcels) {
      lands.push(fromParcel(parcel, RoleType.OPERATOR));
    }
    for (const estate of data.updateOperatorEstates) {
      lands.push(fromEstate(estate, RoleType.OPERATOR));
    }

    // parcels and estates that I've rented
    for (const parcel of data.tenantParcels) {
      lands.push(fromParcel(parcel, RoleType.TENANT));
    }
    for (const estate of data.tenantEstates) {
      lands.push(fromEstate(estate, RoleType.TENANT));
    }

    // parcels and estates that I've put for rent
    for (const parcel of data.lessorParcels) {
      lands.push(fromParcel(parcel, RoleType.LESSOR));
    }
    for (const estate of data.lessorEstates) {
      lands.push(fromEstate(estate, RoleType.LESSOR));
    }

    // addresses I gave UpdateManager permission are operators of all my lands
    for (const authorization of data.ownerAuthorizations) {
      const { operator, isApproved, tokenAddress } = authorization;
      switch (tokenAddress) {
        case this.LAND_REGISTRY_ADDRESS: {
          if (isApproved) {
            landUpdateManagers.add(operator);
          } else {
            landUpdateManagers.delete(operator);
          }
          break;
        }
        case this.ESTATE_REGISTRY_ADDRESS: {
          if (isApproved) {
            estateUpdateManagers.add(operator);
          } else {
            estateUpdateManagers.delete(operator);
          }
          break;
        }
      }
    }

    // I'm operator of all the lands from addresses that gave me UpdateManager permission
    for (const authorization of data.operatorAuthorizations) {
      const { owner } = authorization;
      for (const parcel of owner.parcels) {
        const land = fromParcel(parcel, RoleType.OPERATOR);
        land.operators.push(address);
        // skip if already owned or operated
        if (!lands.some(_land => _land.id === land.id)) {
          lands.push(land);
        }
      }
      for (const estate of owner.estates) {
        if (estate.parcels.length > 0) {
          const land = fromEstate(estate, RoleType.OPERATOR);
          land.operators.push(address);
          // skip if already owned or operated
          if (!lands.some(_land => _land.id === land.id)) {
            lands.push(land);
          }
        }
      }
    }

    // add operators for all my lands
    const authorizations: Authorization[] = [];
    for (const operator of landUpdateManagers.values()) {
      authorizations.push({ address: operator, type: LandType.PARCEL });
      const parcels = lands.filter(
        land => land.type === LandType.PARCEL && land.role === RoleType.OWNER,
      );
      for (const parcel of parcels) {
        parcel.operators.push(operator);
      }
    }
    for (const operator of estateUpdateManagers.values()) {
      authorizations.push({ address: operator, type: LandType.ESTATE });
      const estates = lands.filter(
        land => land.type === LandType.ESTATE && land.role === RoleType.OWNER,
      );
      for (const estate of estates) {
        estate.operators.push(operator);
      }
    }

    const landsMap: Record<string, Land> = {};

    for (const land of lands) {
      // Remove empty estates
      if (land.type === LandType.ESTATE && land.parcels!.length <= 0) {
        continue;
      }

      // Remove duplicated and zero address operators
      land.operators = Array.from(new Set(land.operators)).filter(address => !isZero(address));

      const savedLand = landsMap[land.id];

      if (savedLand) {
        // Update existing land roles
        savedLand.roles = [...savedLand.roles, land.role].sort();
        savedLand.role = savedLand.roles[0];
      } else {
        // Add to the total map
        landsMap[land.id] = land;
      }
    }

    // check if we need to fetch more results
    if (isMax(data)) {
      // merge results recursively
      const [moreLands, moreAuthorizations] = await this.fetchLand(
        address,
        tenantTokenIds,
        lessorTokenIds,
        skip + MAX_RESULTS,
      );
      const landResults = [...Object.values(landsMap), ...moreLands];
      const authorizationResults = [...authorizations, ...moreAuthorizations];
      return [landResults, authorizationResults];
    } else {
      return [Object.values(landsMap), authorizations];
    }
  };
}

export const rentalFields = () => `
  fragment rentalFields on Rental {
    id
    contractAddress
    tokenId
    lessor
    tenant
    operator
    startedAt
    endsAt
  }
`;

const getRentalsQuery = () => `query Rentals($address: Bytes) {
    tenantRentals: rentals(where: { tenant: $address, isActive: true }) {
      ...rentalFields
    }
    lessorRentals: rentals(where: { lessor: $address, isActive: true }) {
      ...rentalFields
    }
  }
  ${rentalFields()}
`;

export class Rentals {
  private subgraph = 'https://subgraph.decentraland.org/rentals-ethereum-mainnet';
  private LAND_REGISTRY_ADDRESS = '0xf87e31492faf9a91b02ee0deaad50d51d56d5d4d';
  private ESTATE_REGISTRY_ADDRESS = '0x959e104e1a4db6317fa58f8295f586e1a978c297';

  constructor(isDev: boolean) {
    if (isDev) {
      this.subgraph =
        'https://api.studio.thegraph.com/query/49472/rentals-ethereum-sepolia/version/latest';
      this.LAND_REGISTRY_ADDRESS = '0x42f4ba48791e2de32f5fbf553441c2672864bb33';
      this.ESTATE_REGISTRY_ADDRESS = '0x369a7fbe718c870c79f99fb423882e8dd8b20486';
    }
  }

  fetchRentalTokenIds = async (
    address: string,
  ): Promise<{ lessorRentals: Rental[]; tenantRentals: Rental[] }> => {
    const response: Response = await fetch(this.subgraph, {
      method: 'POST',
      body: JSON.stringify({
        query: getRentalsQuery(),
        variables: {
          address: address.toLowerCase(),
        },
      }),
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
      },
    });

    const {
      data,
    }: {
      data: {
        lessorRentals: RentalFields[];
        tenantRentals: RentalFields[];
      };
    } = await response.json();

    return {
      lessorRentals: data.lessorRentals.map(this.fromRentalFields),
      tenantRentals: data.tenantRentals.map(this.fromRentalFields),
    };
  };

  getLandType = (contractAddress: string): LandType => {
    switch (contractAddress.toLowerCase()) {
      case this.LAND_REGISTRY_ADDRESS:
        return LandType.PARCEL;
      case this.ESTATE_REGISTRY_ADDRESS:
        return LandType.ESTATE;
      default:
        throw new Error(`Could not derive land type from contract address "${contractAddress}"`);
    }
  };

  fromRentalFields = (fields: RentalFields): Rental => {
    return {
      id: fields.id,
      type: this.getLandType(fields.contractAddress),
      tokenId: fields.tokenId,
      lessor: fields.lessor,
      tenant: fields.tenant,
      operator: fields.operator,
      startedAt: fromUnixTime(+fields.startedAt),
      endsAt: fromUnixTime(+fields.endsAt),
    };
  };
}
