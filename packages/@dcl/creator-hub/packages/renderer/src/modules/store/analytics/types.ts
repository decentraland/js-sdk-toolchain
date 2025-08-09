import type { Action } from '@reduxjs/toolkit';

export type WindowWithAnalytics = Window & {
  analytics: SegmentAnalytics.AnalyticsJS;
};

export interface TypedActionCreator<Type extends string> {
  (...args: any[]): Action<Type>;
  type: Type;
}
