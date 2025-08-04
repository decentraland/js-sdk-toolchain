import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { settings as settingsPreload } from '#preload';
import type { IpcRendererEvent } from 'electron';
import { actions as snackbarActions } from '../snackbar/slice';
import { t } from '../translation/utils';
import { createAsyncThunk } from '../thunk';
import type { Status } from '/shared/types/async';

export type UpdateStatus = {
  lastDownloadedVersion: string | null;
  openNewUpdateModal: boolean;
  openAppSettingsModal: boolean;
  downloadingUpdate: {
    isDownloading: boolean;
    progress: number;
    finished: boolean;
    version: string | null;
    error: string | null;
  };
  updateInfo: {
    available: boolean;
    version: string | null;
    isDownloaded: boolean;
  };
  checkForUpdates: {
    status: Status;
  };
};

const initialState: UpdateStatus = {
  lastDownloadedVersion: null,
  openNewUpdateModal: false,
  openAppSettingsModal: false,
  downloadingUpdate: {
    isDownloading: false,
    progress: 0,
    finished: false,
    version: null,
    error: null,
  },
  updateInfo: {
    available: false,
    version: null,
    isDownloaded: false,
  },
  checkForUpdates: {
    status: 'idle',
  },
};

const slice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setlastDownloadedVersion: (state, action: PayloadAction<string | null>) => {
      state.lastDownloadedVersion = action.payload;
    },
    setDownloadingUpdate: (state, action: PayloadAction<UpdateStatus['downloadingUpdate']>) => {
      state.downloadingUpdate = action.payload;
    },
    setUpdateInfo: (state, action: PayloadAction<UpdateStatus['updateInfo']>) => {
      state.updateInfo = action.payload;
    },
    setOpenNewUpdateModal: (state, action: PayloadAction<boolean>) => {
      state.openNewUpdateModal = action.payload;
    },
    setOpenAppSettingsModal: (state, action: PayloadAction<boolean>) => {
      state.openAppSettingsModal = action.payload;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(checkForUpdates.pending, state => {
        state.checkForUpdates.status = 'loading';
        state.updateInfo = initialState.updateInfo;
      })
      .addCase(checkForUpdates.fulfilled, (state, _action) => {
        state.checkForUpdates.status = 'succeeded';
      })
      .addCase(checkForUpdates.rejected, state => {
        state.checkForUpdates.status = 'failed';
        state.updateInfo = initialState.updateInfo;
      });
  },
});

export const setupUpdaterEvents = createAsyncThunk('settings/setupUpdaterEvents', async () => {
  settingsPreload.setupUpdaterEvents();
});

export const notifyUpdate = createAsyncThunk(
  'settings/notifyUpdate',
  async (_, { dispatch, getState }) => {
    const newVersion = await settingsPreload.getInstalledVersion();
    const currentVersion = getState().editor.version;
    if (newVersion && currentVersion === newVersion) {
      settingsPreload.deleteVersionFile();
      dispatch(
        snackbarActions.pushSnackbar({
          id: 'version-updated',
          message: `New version ${newVersion} installed`,
          severity: 'success',
          type: 'generic',
        }),
      );
    }
  },
);

export const checkForUpdates = createAsyncThunk(
  'settings/checkForUpdates',
  async ({ autoDownload = false }: { autoDownload?: boolean }, { dispatch, getState }) => {
    try {
      const { updateAvailable, version } = await settingsPreload.checkForUpdates({
        autoDownload,
      });
      const lastDownloadedVersion = getState().settings.downloadingUpdate.version;
      dispatch(
        actions.setUpdateInfo({
          available: !!updateAvailable,
          version: version ?? null,
          isDownloaded: !!lastDownloadedVersion && lastDownloadedVersion === version,
        }),
      );
    } catch (error) {
      dispatch(
        snackbarActions.pushSnackbar({
          id: 'check-updates-error',
          message: t('modal.app_settings.update.error'),
          severity: 'error',
          type: 'generic',
        }),
      );
      throw error;
    }
  },
);

export const subscribeToDownloadingStatus = createAsyncThunk(
  'settings/subscribeToDownloadingStatus',
  async (_, { dispatch, getState }) => {
    settingsPreload.downloadingStatus(
      (
        _event: IpcRendererEvent,
        progress: {
          percent: number;
          finished: boolean;
          version: string | null;
          isDownloading: boolean;
          error?: string;
        },
      ) => {
        if (progress.error) {
          return dispatch(
            snackbarActions.pushSnackbar({
              id: 'download-update-error',
              message: t('install.errors.installFailed'),
              severity: 'error',
              type: 'generic',
            }),
          );
        }

        if (progress.finished && progress.percent === 100) {
          !getState().settings.openAppSettingsModal &&
            dispatch(actions.setOpenNewUpdateModal(true));
          dispatch(actions.setlastDownloadedVersion(progress.version));
        }

        dispatch(
          actions.setDownloadingUpdate({
            isDownloading: progress.isDownloading,
            progress: progress.percent,
            finished: progress.finished,
            version: progress.version,
            error: progress.error ?? null,
          }),
        );
      },
    );
  },
);

export const downloadUpdate = createAsyncThunk(
  'settings/downloadUpdate',
  async (_, { dispatch }) => {
    try {
      await settingsPreload.downloadUpdate();
      dispatch(checkForUpdates({ autoDownload: false }));
    } catch (error) {
      dispatch(
        snackbarActions.pushSnackbar({
          id: 'download-update-error',
          message: t('install.errors.downloadFailed'),
          severity: 'error',
          type: 'generic',
        }),
      );
      throw error;
    }
  },
);

export const installUpdate = createAsyncThunk(
  'settings/installUpdate',
  async (_, { dispatch, getState }) => {
    try {
      settingsPreload.quitAndInstall(getState().settings.downloadingUpdate.version ?? '');
    } catch (error) {
      dispatch(
        snackbarActions.pushSnackbar({
          id: 'install-update-error',
          message: t('install.errors.installFailed'),
          severity: 'error',
          type: 'generic',
        }),
      );
      throw error;
    }
  },
);

// exports
export const actions = {
  ...slice.actions,
  checkForUpdates,
  installUpdate,
  subscribeToDownloadingStatus,
  setupUpdaterEvents,
  notifyUpdate,
};

export const reducer = slice.reducer;
export const selectors = { ...slice.selectors };
