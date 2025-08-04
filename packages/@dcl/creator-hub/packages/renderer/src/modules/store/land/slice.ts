import type { Tile } from 'react-tile-map/dist/lib/common';
import { createAsyncThunk, createSlice, createSelector } from '@reduxjs/toolkit';
import type { ChainId } from '@dcl/schemas/dist/dapps/chain-id';
import type { AtlasTileProps } from 'decentraland-ui2/dist/components/Atlas/Atlas.types';
import {
  colorByRole,
  coordsToId,
  Lands,
  LandType,
  Rentals,
  type Authorization,
  type Land,
} from '/@/lib/land';
import type { Async } from '/shared/types/async';
import { isDev } from '/@/modules/utils';

// actions
export const fetchTiles = createAsyncThunk(
  'land/fetchTiles',
  async ({ chainId }: { chainId: ChainId }) => {
    const tilesFetch = await fetch(
      isDev(chainId)
        ? 'https://api.decentraland.zone/v2/tiles'
        : 'https://api.decentraland.org/v2/tiles',
    );
    const tilesJson: {
      ok: boolean;
      data: Record<string, AtlasTileProps>;
      error: string;
    } = await tilesFetch.json();

    return tilesJson.data;
  },
);

export const fetchRentalsList = async (address: string, chainId: ChainId) => {
  const RentalsAPI = new Rentals(isDev(chainId));
  return RentalsAPI.fetchRentalTokenIds(address);
};

export const fetchLandList = createAsyncThunk(
  'land/fetchLandList',
  async ({ address, chainId }: { address: string; chainId: ChainId }) => {
    const LandsAPI = new Lands(isDev(chainId));

    const rentals = await fetchRentalsList(address, chainId);
    const tenantTokenIds = rentals.tenantRentals.map(rental => rental.tokenId);
    const lessorTokenIds = rentals.lessorRentals.map(rental => rental.tokenId);

    const [land, authorizations]: [Land[], Authorization[]] = await LandsAPI.fetchLand(
      address,
      tenantTokenIds,
      lessorTokenIds,
    );

    return {
      land,
      authorizations,
      rentals: rentals.tenantRentals.concat(rentals.lessorRentals),
    };
  },
);

// selectors
const getLands = (state: LandState) => state.data;
const getTiles = (state: LandState) => state.tiles;

const getCoordsByEstateId = createSelector([getTiles], tiles => {
  const result: Record<string, string[]> = {};
  for (const tile of Object.values(tiles)) {
    if (tile.estateId) {
      const exists = tile.estateId in result;
      if (!exists) {
        result[tile.estateId] = [];
      }
      result[tile.estateId].push(coordsToId(tile.x, tile.y));
    }
  }
  return result;
});

const getLandTiles = createSelector(
  [getLands, getTiles, getCoordsByEstateId],
  (lands, tiles, coordsByEstateId) => {
    const result: Record<string, LandTile> = {};
    for (const land of lands) {
      if (land.type === LandType.PARCEL) {
        const id = coordsToId(land.x!, land.y!);
        result[id] = {
          color: colorByRole[land.role],
          land,
        };
      } else {
        const estateId = land.id;
        const coords = coordsByEstateId[estateId];
        if (coords) {
          for (const coord of coords) {
            const tile = tiles[coord];
            if (tile) {
              result[coord] = {
                color: colorByRole[land.role],
                top: !!tile.top,
                left: !!tile.left,
                topLeft: !!tile.topLeft,
                land,
              };
            }
          }
        }
      }
    }
    return result;
  },
);

// state
export type LandTile = Tile & { land: Land };
export type LandState = {
  data: Land[];
  tiles: Record<string, AtlasTileProps>;
  error: string | null;
};

export const initialState: Async<LandState> = {
  data: [],
  tiles: {},
  status: 'idle',
  error: null,
};

// slice
export const slice = createSlice({
  name: 'land',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchLandList.pending, state => {
        state.status = 'loading';
      })
      .addCase(fetchLandList.fulfilled, (state, action) => {
        state.data = [...action.payload.land];
        state.status = 'succeeded';
      })
      .addCase(fetchTiles.pending, state => {
        state.status = 'loading';
      })
      .addCase(fetchTiles.fulfilled, (state, action) => {
        state.tiles = { ...action.payload };
        state.status = 'succeeded';
      });
  },
});

// exports
export const actions = { ...slice.actions, fetchLandList };
export const reducer = slice.reducer;
export const selectors = {
  ...slice.selectors,
  getLands,
  getTiles,
  getCoordsByEstateId,
  getLandTiles,
};
