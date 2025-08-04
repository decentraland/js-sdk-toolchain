import type { Action, Middleware } from '@reduxjs/toolkit';
import { handleAction } from './utils';
import './track';

export function createAnalyticsMiddleware(): Middleware {
  return _store => next => action => {
    void handleAction(action as Action);
    next(action);
  };
}
