import type { Action } from '@reduxjs/toolkit';
import { analyticsConfig } from './track';
import { analytics } from '#preload';
import { store } from '#store';

export async function handleAction(action: Action) {
  if (isActionTrackable(action)) {
    const handler = analyticsConfig[action.type];
    const payload = handler.getPayload(action as any, store.getState);
    await analytics.track(handler.eventName, payload);
  }
}

export function isActionTrackable(action: Action) {
  if (action && action.type) {
    return action.type in analyticsConfig;
  }
}
