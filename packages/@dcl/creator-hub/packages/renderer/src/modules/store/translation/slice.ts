import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { Locale } from '/shared/types/translation';

import type { TranslationKeys } from './types';
import * as utils from './utils';

// state
export type TranslationState = {
  keys: TranslationKeys;
  locale: Locale;
};

export const initialState: TranslationState = {
  keys: utils.getKeys('en'),
  locale: 'en',
};

// slice
export const slice = createSlice({
  name: 'translation',
  initialState,
  reducers: {
    changeLocale(state, action: PayloadAction<Locale>) {
      state.locale = action.payload;
      state.keys = utils.getKeys(action.payload);
    },
  },
  selectors: {
    getLocale: state => state.locale,
    getKeys: state => state.keys,
  },
});

// exports
export const actions = { ...slice.actions };
export const reducer = slice.reducer;
export const selectors = { ...slice.selectors };
