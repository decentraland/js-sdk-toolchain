import { createSlice } from '@reduxjs/toolkit';
import type { ChainId } from '@dcl/schemas';

import { createAsyncThunk } from '/@/modules/store/thunk';

import type { DeployOptions } from '/shared/types/deploy';
import { type Project } from '/shared/types/projects';
import type { PreviewOptions } from '/shared/types/settings';
import { WorkspaceError } from '/shared/types/workspace';

import { actions as deploymentActions } from '../deployment';
import { actions as workspaceActions } from '../workspace';

import { editor } from '#preload';

// actions
export const fetchVersion = createAsyncThunk('editor/fetchVersion', editor.getVersion);
export const install = createAsyncThunk('editor/install', editor.install);
export const startInspector = createAsyncThunk('editor/startInspector', editor.startInspector);
export const runScene = createAsyncThunk(
  'editor/runScene',
  async ({ path, ...opts }: PreviewOptions & { path: string }) => {
    const { debugger: openDebugger } = opts;
    const id = await editor.runScene({ path, opts });
    if (openDebugger) {
      await editor.openSceneDebugger(id);
    }
  },
);
export const publishScene = createAsyncThunk(
  'editor/publishScene',
  async (opts: DeployOptions & { chainId: ChainId; wallet: string }, { dispatch, getState }) => {
    const { translation } = getState();
    const port = await editor.publishScene({ ...opts, language: translation.locale });
    const deployment = { path: opts.path, port, chainId: opts.chainId, wallet: opts.wallet };
    dispatch(deploymentActions.initializeDeployment(deployment));
    return port;
  },
);
export const killPreviewScene = createAsyncThunk(
  'editor/killPreviewScene',
  editor.killPreviewScene,
);
export const openTutorial = createAsyncThunk('editor/openTutorial', editor.openTutorial);
export const openExternalURL = createAsyncThunk('editor/openExternalURL', editor.openExternalURL);

// state
export type EditorState = {
  version: string | null;
  project?: Project;
  inspectorPort: number;
  publishPort: number;
  loadingPublish: boolean;
  publishError: string | null;
  loadingInspector: boolean;
  loadingPreview: boolean;
  isInstalling: boolean;
  isInstalled: boolean;
  isInstallingProject: boolean;
  isInstalledProject: boolean;
  isFetchingVersion: boolean;
  error: Error | string | null;
};

const initialState: EditorState = {
  version: null,
  inspectorPort: 0,
  publishPort: 0,
  loadingPublish: false,
  publishError: null,
  loadingInspector: false,
  loadingPreview: false,
  isInstalling: false,
  isInstallingProject: false,
  isInstalledProject: false,
  isInstalled: false,
  isFetchingVersion: false,
  error: null,
};

// slice
export const slice = createSlice({
  name: 'editor',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder.addCase(workspaceActions.runProject.pending, state => {
      state.project = undefined;
      state.error = null;
    });
    builder.addCase(workspaceActions.runProject.fulfilled, (state, action) => {
      state.project = action.payload;
      state.error = null;
    });
    builder.addCase(workspaceActions.runProject.rejected, (state, payload) => {
      // TODO: Thunks return a SerializedError instead of the actual error thrown, so we have to do this
      // ugly hack 👇 to check for the error name, which instead should be using "isWorkspaceError" to check that.
      // Maybe there is a better way...
      if (payload.error.name === 'PROJECT_NOT_FOUND') {
        state.error = new WorkspaceError(payload.error.name);
      }
      state.project = undefined;
    });
    builder.addCase(startInspector.pending, state => {
      state.inspectorPort = 0;
      state.loadingInspector = true;
    });
    builder.addCase(startInspector.fulfilled, (state, action) => {
      state.inspectorPort = action.payload;
      state.loadingInspector = false;
    });
    builder.addCase(startInspector.rejected, (state, action) => {
      state.error = action.error.message ? new Error(action.error.message) : null;
      state.loadingInspector = false;
    });
    builder.addCase(publishScene.pending, state => {
      state.publishPort = 0;
      state.loadingPublish = true;
      state.publishError = null;
    });
    builder.addCase(publishScene.fulfilled, (state, action) => {
      state.publishPort = action.payload;
      state.loadingPublish = false;
    });
    builder.addCase(publishScene.rejected, (state, action) => {
      state.publishError = action.error.message || null;
      state.loadingPublish = false;
    });
    builder.addCase(workspaceActions.createProject.pending, state => {
      state.project = undefined;
    });
    builder.addCase(workspaceActions.createProject.fulfilled, (state, action) => {
      state.project = action.payload;
    });
    builder.addCase(workspaceActions.updateProject, (state, action) => {
      if (state.project) state.project = action.payload;
    });
    builder.addCase(install.pending, state => {
      state.isInstalling = true;
    });
    builder.addCase(install.fulfilled, state => {
      state.isInstalling = false;
      state.isInstalled = true;
    });
    builder.addCase(install.rejected, (state, action) => {
      state.error = action.error.message || null;
      state.isInstalling = false;
    });
    builder.addCase(fetchVersion.fulfilled, (state, action) => {
      state.version = action.payload;
      state.isFetchingVersion = false;
    });
    builder.addCase(fetchVersion.pending, state => {
      state.isFetchingVersion = true;
    });
    builder.addCase(fetchVersion.rejected, (state, action) => {
      state.error = action.error.message ? new Error(action.error.message) : null;
      state.isFetchingVersion = false;
    });
    builder.addCase(runScene.pending, state => {
      state.loadingPreview = true;
    });
    builder.addCase(runScene.fulfilled, state => {
      state.loadingPreview = false;
    });
    builder.addCase(runScene.rejected, state => {
      state.loadingPreview = false;
    });
    builder.addCase(workspaceActions.saveAndGetThumbnail.pending, state => {
      if (state.project) state.project.status = 'loading';
    });
    builder.addCase(workspaceActions.installProject.pending, state => {
      state.isInstallingProject = true;
    });
    builder.addCase(workspaceActions.installProject.fulfilled, state => {
      state.isInstalledProject = true;
      state.isInstallingProject = false;
    });
    builder.addCase(workspaceActions.installProject.rejected, state => {
      state.isInstallingProject = false;
    });
    builder.addCase(workspaceActions.saveAndGetThumbnail.fulfilled, (state, action) => {
      if (state.project) {
        state.project.thumbnail = action.payload;
        state.project.status = 'succeeded';
      }
    });
    builder.addCase(workspaceActions.saveAndGetThumbnail.rejected, state => {
      if (state.project) state.project.status = 'failed';
    });
  },
});

// exports
export const actions = {
  ...slice.actions,
  fetchVersion,
  install,
  startInspector,
  runScene,
  publishScene,
  openTutorial,
  killPreviewScene,
  openExternalURL,
};
export const reducer = slice.reducer;
export const selectors = { ...slice.selectors };
