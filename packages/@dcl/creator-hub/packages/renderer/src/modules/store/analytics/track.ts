import { actions as workspaceActions } from '../workspace';
import { actions as editorActions } from '../editor';
import type { Events } from '/shared/types/analytics';
import type { Project } from '/shared/types/projects';
import { type GetState } from '#store';

type ActionWithPayload<P> = {
  type: string;
  payload: P;
};

type AnalyticsHandler<T, E extends keyof Events = keyof Events> = {
  eventName: E;
  getPayload: (action: T, getState: GetState) => Events[E];
};

export const analyticsConfig: Record<string, AnalyticsHandler<any>> = {
  [workspaceActions.createProject.fulfilled.type]: {
    eventName: 'Create Project',
    getPayload: (action: ActionWithPayload<Project>): Events['Create Project'] => ({
      project_id: action.payload.id,
      project_name: action.payload.title,
      template: action.payload.description || '',
      rows: action.payload.layout.rows,
      cols: action.payload.layout.cols,
    }),
  },
  [workspaceActions.runProject.fulfilled.type]: {
    eventName: 'Open Project',
    getPayload: (action: ActionWithPayload<Project>): Events['Open Project'] => ({
      project_id: action.payload.id,
      project_name: action.payload.title,
    }),
  },
  [workspaceActions.updateProject.type]: {
    eventName: 'Save Project Success',
    getPayload: (action: ActionWithPayload<Project>): Events['Save Project Success'] => ({
      project_id: action.payload.id,
      project_name: action.payload.title,
    }),
  },
  [editorActions.runScene.pending.type]: {
    eventName: 'Preview Scene',
    getPayload: (_action: ActionWithPayload<void>, getState: GetState): Events['Preview Scene'] => {
      const projectId = getState().editor.project?.id;
      if (!projectId) throw new Error('No project ID found when trying to preview scene');
      return {
        project_id: projectId,
      };
    },
  },
  [editorActions.publishScene.fulfilled.type]: {
    eventName: 'Publish Scene',
    getPayload: (action: any, getState: GetState): Events['Publish Scene'] => {
      const projectId = getState().editor.project?.id;
      if (!projectId) throw new Error('No project ID found when trying to publish scene');
      return {
        project_id: projectId,
        target: action.meta.arg.target,
        targetContent: action.meta.arg.targetContent,
      };
    },
  },
};
