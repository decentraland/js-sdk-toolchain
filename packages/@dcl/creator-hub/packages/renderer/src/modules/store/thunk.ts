// IMPORTANT!
// TLDR: This intermediate file is needed to avoid circular dependencies between the reducers and the store...

// Reason: Since using ".withTypes" requires the store state, this function will be defined after
// the store is resolved. But the store file calls all the reducers to create the store and also calls
// all the reducers files. The reducers files define thunks using "createAsyncThunk", so they require the
// store to be defined, thus the circular dependency error. Using an intermediate file solves this problem.

import { createAsyncThunk as formerCreateAsyncThunk } from '@reduxjs/toolkit';

import type { AppDispatch, AppState } from '.';

export const createAsyncThunk = formerCreateAsyncThunk.withTypes<{
  state: AppState;
  dispatch: AppDispatch;
}>();
