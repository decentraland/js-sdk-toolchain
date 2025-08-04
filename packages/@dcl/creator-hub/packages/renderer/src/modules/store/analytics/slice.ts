import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { analytics } from '#preload';

// actions
export const fetchAnonymousId = createAsyncThunk(
  'analytics/fetchAnonymousId',
  analytics.getAnonymousId,
);
export const identify = createAsyncThunk(
  'analytics/identify',
  async (opts: { userId: string; traits?: Record<string, any> }) =>
    analytics.identify(opts.userId, opts.traits),
);

// state
export type AnalyticsState = {
  loading: boolean;
  anonymousId: string | null;
  userId: string | null;
  error: string | null;
};

const initialState: AnalyticsState = {
  loading: false,
  anonymousId: null,
  userId: null,
  error: null,
};

// selectors

// slice
export const slice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(fetchAnonymousId.pending, state => {
      state.loading = true;
    });
    builder.addCase(fetchAnonymousId.fulfilled, (state, action) => {
      state.loading = false;
      state.anonymousId = action.payload;
      state.error = null;
    });
    builder.addCase(fetchAnonymousId.rejected, (state, action) => {
      state.loading = false;
      state.error = action.error.message || null;
    });
    builder.addCase(identify.pending, (state, action) => {
      state.userId = action.meta.arg.userId;
    });
  },
});

// exports
export const actions = {
  ...slice.actions,
  fetchAnonymousId,
};
export const reducer = slice.reducer;
export const selectors = { ...slice.selectors };
