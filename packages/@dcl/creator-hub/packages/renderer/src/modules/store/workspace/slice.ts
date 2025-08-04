import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { type Project, SortBy } from '/shared/types/projects';
import { DEFAULT_DEPENDENCY_UPDATE_STRATEGY } from '/shared/types/settings';
import { type Workspace } from '/shared/types/workspace';

import type { Async } from '/shared/types/async';

import * as deployment from '../deployment/slice';
import * as thunks from './thunks';

const initialState: Async<Workspace> = {
  sortBy: SortBy.NEWEST,
  projects: [],
  missing: [],
  templates: [],
  settings: {
    scenesPath: '',
    dependencyUpdateStrategy: DEFAULT_DEPENDENCY_UPDATE_STRATEGY,
    previewOptions: {
      debugger: false,
      skipAuthScreen: true,
      enableLandscapeTerrains: true,
      openNewInstance: false,
    },
  },
  status: 'idle',
  error: null,
};

export const slice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setSortBy: (state, { payload: type }: PayloadAction<SortBy>) => {
      state.sortBy = type;
    },
    moveProjectToMissing: (state, { payload }: PayloadAction<Project>) => {
      state.projects = state.projects.reduce((projects: Project[], project) => {
        if (payload.path === project.path) state.missing.push(project.path);
        else projects.push(project);
        return projects;
      }, []);
    },
    updateProject: (state, { payload: project }: PayloadAction<Project>) => {
      const idx = state.projects.findIndex($ => $.path === project.path);
      if (idx !== -1) {
        state.projects[idx] = project;
      }
    },
  },
  extraReducers: builder => {
    // nth: generic case adder so we don't end up with this mess 👇
    builder
      .addCase(thunks.getWorkspace.pending, state => {
        state.status = 'loading';
      })
      .addCase(thunks.getWorkspace.fulfilled, (_, action) => {
        return {
          ...action.payload,
          status: 'succeeded',
          error: null,
        };
      })
      .addCase(thunks.getWorkspace.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || 'Failed to get workspace';
      })
      .addCase(thunks.createProject.fulfilled, (state, action) => {
        state.projects = [...state.projects, action.payload];
      })
      .addCase(thunks.deleteProject.pending, state => {
        state.status = 'loading';
      })
      .addCase(thunks.deleteProject.fulfilled, (state, action) => {
        return {
          ...state,
          projects: state.projects.filter($ => $.path !== action.meta.arg),
          status: 'succeeded',
          error: null,
        };
      })
      .addCase(thunks.deleteProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || `Failed to delete project ${action.meta.arg}`;
      })
      .addCase(thunks.duplicateProject.pending, _state => {})
      .addCase(thunks.duplicateProject.fulfilled, (state, action) => {
        return {
          ...state,
          projects: state.projects.concat(action.payload),
          status: 'succeeded',
          error: null,
        };
      })
      .addCase(thunks.duplicateProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || `Failed to duplicate project ${action.meta.arg}`;
      })
      .addCase(thunks.importProject.pending, state => {
        state.status = 'loading';
      })
      .addCase(thunks.importProject.fulfilled, (state, action) => {
        const newProject = action.payload;
        return {
          ...state,
          projects: newProject ? state.projects.concat(newProject) : state.projects,
          status: 'succeeded',
          error: null,
        };
      })
      .addCase(thunks.importProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || `Failed to import project ${action.meta.arg}`;
      })
      .addCase(thunks.reimportProject.pending, state => {
        state.status = 'loading';
      })
      .addCase(thunks.reimportProject.fulfilled, (state, action) => {
        const newProject = action.payload;
        return {
          ...state,
          projects: newProject ? state.projects.concat(newProject) : state.projects,
          missing: newProject ? state.missing.filter($ => $ !== action.meta.arg) : state.missing,
          status: 'succeeded',
          error: null,
        };
      })
      .addCase(thunks.reimportProject.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || `Failed to re-import project ${action.meta.arg}`;
      })
      .addCase(thunks.unlistProjects.pending, state => {
        state.status = 'loading';
      })
      .addCase(thunks.unlistProjects.fulfilled, (state, action) => {
        const pathsSet = new Set(action.meta.arg);
        return {
          ...state,
          missing: state.missing.filter($ => !pathsSet.has($)),
          status: 'succeeded',
          error: null,
        };
      })
      .addCase(thunks.unlistProjects.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message || `Failed to unlists projects: ${action.meta.arg}`;
      })
      .addCase(
        thunks.updateAvailableDependencyUpdates.fulfilled,
        (state, { payload: { project } }) => {
          const projectIdx = state.projects.findIndex($ => $.path === project.path);
          if (projectIdx !== -1) {
            state.projects[projectIdx] = project;
          }
        },
      )
      .addCase(thunks.updateSettings.fulfilled, (state, { meta }) => {
        state.settings = meta.arg;
      })
      .addCase(thunks.getProject.pending, (state, { meta }) => {
        const projectIdx = state.projects.findIndex($ => $.path === meta.arg.path);
        if (projectIdx !== -1) {
          state.projects[projectIdx] = { ...state.projects[projectIdx], status: 'loading' };
        }
      })
      .addCase(thunks.getProject.fulfilled, (state, { payload: project }) => {
        const projectIdx = state.projects.findIndex($ => $.path === project.path);
        if (projectIdx !== -1) {
          state.projects[projectIdx] = { ...project, status: 'succeeded' };
        }
      })
      .addCase(thunks.getProject.rejected, (state, { meta }) => {
        const projectIdx = state.projects.findIndex($ => $.path === meta.arg.path);
        if (projectIdx !== -1) {
          state.projects[projectIdx] = { ...state.projects[projectIdx], status: 'failed' };
        }
      })
      .addCase(deployment.executeDeployment.fulfilled, (state, payload) => {
        const path = payload.meta.arg;
        const projectIdx = state.projects.findIndex($ => $.path === path);
        if (projectIdx !== -1) {
          state.projects[projectIdx] = { ...state.projects[projectIdx], publishedAt: Date.now() };
        }
      });
  },
});

// exports
export const actions = {
  ...slice.actions,
  ...thunks,
};
export const reducer = slice.reducer;
export const selectors = { ...slice.selectors };
