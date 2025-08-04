import { configureStore } from '@reduxjs/toolkit';
import * as editor from '../../src/modules/store/editor';
import * as snackbar from '../../src/modules/store/snackbar';
import * as translations from '../../src/modules/store/translation';
import * as workspace from '../../src/modules/store/workspace';
import * as deployment from '../../src/modules/store/deployment';
import * as analytics from '../../src/modules/store/analytics';
import * as ens from '../../src/modules/store/ens';
import * as land from '../../src/modules/store/land';

export const createTestStore = () =>
  configureStore({
    reducer: {
      editor: editor.reducer,
      snackbar: snackbar.reducer,
      translation: translations.reducer,
      workspace: workspace.reducer,
      deployment: deployment.reducer,
      analytics: analytics.reducer,
      ens: ens.reducer,
      land: land.reducer,
    },
    middleware: getDefaultMiddleware =>
      getDefaultMiddleware({
        thunk: true,
        serializableCheck: false,
      }),
  });

export type TestStore = ReturnType<typeof createTestStore>;
