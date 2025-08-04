import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import { t } from '/@/modules/store/translation/utils';

import { actions as workspaceActions } from '../workspace';
import { actions as deploymentActions } from '../deployment';
import { shouldNotifyUpdates } from '../workspace/utils';
import { createCustomNotification, createGenericNotification } from './utils';
import type { Notification } from './types';

// state
export type SnackbarState = {
  notifications: Notification[];
};

export const initialState: SnackbarState = {
  notifications: [],
};

// slice
export const slice = createSlice({
  name: 'snackbar',
  initialState,
  reducers: {
    pushSnackbar: (state, { payload: notification }: PayloadAction<Notification>) => {
      state.notifications = state.notifications.filter($ => $.id !== notification.id);
      state.notifications.push(notification);
    },
    removeSnackbar: (state, { payload: id }: PayloadAction<Notification['id']>) => {
      state.notifications = state.notifications.filter($ => $.id !== id);
    },
  },
  extraReducers: builder => {
    builder
      .addCase(workspaceActions.getWorkspace.fulfilled, (state, action) => {
        if (action.payload.missing.length > 0) {
          state.notifications.push(
            createCustomNotification({ type: 'missing-scenes' }, { duration: 0 }),
          );
        }
      })
      .addCase(workspaceActions.importProject.pending, (state, payload) => {
        const { requestId } = payload.meta;
        state.notifications.push(
          createGenericNotification('loading', t('snackbar.generic.import_scene'), {
            duration: 0,
            requestId,
          }),
        );
      })
      .addCase(workspaceActions.installProject.pending, (state, payload) => {
        const { requestId } = payload.meta;
        state.notifications.push(
          createGenericNotification('loading', t('snackbar.generic.installing_dependencies'), {
            requestId,
            duration: 0,
          }),
        );
      })
      .addCase(workspaceActions.installProject.fulfilled, (state, payload) => {
        const { requestId } = payload.meta;
        state.notifications = state.notifications.filter($ => $.id !== requestId);
      })
      .addCase(workspaceActions.installProject.rejected, (state, payload) => {
        const { requestId } = payload.meta;
        state.notifications = state.notifications.filter($ => $.id !== requestId);
        state.notifications.push(
          createGenericNotification('error', t('snackbar.generic.installing_dependencies_failed'), {
            requestId,
            duration: 2_000,
          }),
        );
      })
      .addCase(workspaceActions.importProject.fulfilled, (state, payload) => {
        const { requestId } = payload.meta;
        state.notifications = state.notifications.filter($ => $.id !== requestId);
      })
      .addCase(workspaceActions.importProject.rejected, (state, payload) => {
        const { requestId } = payload.meta;
        state.notifications = state.notifications.filter($ => $.id !== requestId);
        state.notifications.push(
          createGenericNotification('error', t('snackbar.generic.import_scene_failed'), {
            requestId,
          }),
        );
      })
      .addCase(workspaceActions.duplicateProject.pending, (state, payload) => {
        const { requestId } = payload.meta;
        state.notifications.push(
          createGenericNotification('loading', t('snackbar.generic.duplicate_scene'), {
            duration: 0,
            requestId,
          }),
        );
      })
      .addCase(workspaceActions.duplicateProject.fulfilled, (state, payload) => {
        const { requestId } = payload.meta;
        state.notifications = state.notifications.filter($ => $.id !== requestId);
      })
      .addCase(workspaceActions.duplicateProject.rejected, (state, payload) => {
        const { requestId } = payload.meta;
        state.notifications = state.notifications.filter($ => $.id !== requestId);
        state.notifications.push(
          createGenericNotification('error', t('snackbar.generic.duplicate_scene_failed'), {
            requestId,
          }),
        );
      })
      .addCase(workspaceActions.deleteProject.pending, (state, payload) => {
        const { requestId } = payload.meta;
        state.notifications.push(
          createGenericNotification('loading', t('snackbar.generic.delete_scene'), {
            duration: 0,
            requestId,
          }),
        );
      })
      .addCase(workspaceActions.deleteProject.fulfilled, (state, payload) => {
        const { requestId } = payload.meta;
        state.notifications = state.notifications.filter($ => $.id !== requestId);
      })
      .addCase(workspaceActions.deleteProject.rejected, (state, payload) => {
        const { requestId } = payload.meta;
        state.notifications = state.notifications.filter($ => $.id !== requestId);
        state.notifications.push(
          createGenericNotification('error', t('snackbar.generic.delete_scene_failed'), {
            requestId,
          }),
        );
      })
      .addCase(workspaceActions.moveProjectToMissing, state => {
        const oldMissingScenesNotification = state.notifications.find(
          $ => $.type === 'missing-scenes',
        );
        if (!oldMissingScenesNotification) {
          state.notifications.push(
            createCustomNotification({ type: 'missing-scenes' }, { duration: 0 }),
          );
        }
      })
      .addCase(workspaceActions.updatePackages.fulfilled, state => {
        state.notifications = state.notifications.filter($ => $.requestId !== 'updatePackages');
        state.notifications.push(
          createGenericNotification('success', t('snackbar.generic.dependencies_updated'), {
            requestId: 'updatePackages',
          }),
        );
      })
      .addCase(
        workspaceActions.updateAvailableDependencyUpdates.fulfilled,
        (state, { meta, payload: { project, strategy } }) => {
          state.notifications = state.notifications.filter(
            $ => $.type !== 'new-dependency-version',
          );
          if (shouldNotifyUpdates(strategy, project.dependencyAvailableUpdates)) {
            state.notifications.push(
              createCustomNotification(
                { type: 'new-dependency-version', project },
                { duration: 0, requestId: meta.requestId },
              ),
            );
          }
        },
      )
      .addCase(deploymentActions.executeDeployment.fulfilled, (state, action) => {
        const path = action.meta.arg;
        state.notifications = state.notifications.filter($ => $.requestId !== path);
        state.notifications.push(
          createCustomNotification({ type: 'deploy', path }, { duration: 0, requestId: path }),
        );
      })
      .addCase(deploymentActions.executeDeployment.rejected, (state, action) => {
        const path = action.meta.arg;
        state.notifications = state.notifications.filter($ => $.requestId !== path);
        state.notifications.push(
          createCustomNotification({ type: 'deploy', path }, { duration: 0, requestId: path }),
        );
      });
  },
});

// exports
export const actions = { ...slice.actions };
export const reducer = slice.reducer;
export const selectors = { ...slice.selectors };
