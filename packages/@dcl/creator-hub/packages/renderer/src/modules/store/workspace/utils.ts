import { npm, workspace } from '#preload';

import { DEPENDENCY_UPDATE_STRATEGY } from '/shared/types/settings';
import { type DependencyState } from '/shared/types/projects';

export const hasOutdatedDependencies = (deps: DependencyState) => {
  return !!Object.keys(deps).length;
};

export const shouldUpdateDependencies = (
  strategy: DEPENDENCY_UPDATE_STRATEGY,
  deps: DependencyState,
) => {
  return strategy === DEPENDENCY_UPDATE_STRATEGY.AUTO_UPDATE && hasOutdatedDependencies(deps);
};

export const shouldNotifyUpdates = (
  strategy: DEPENDENCY_UPDATE_STRATEGY,
  deps: DependencyState,
) => {
  return strategy === DEPENDENCY_UPDATE_STRATEGY.NOTIFY && hasOutdatedDependencies(deps);
};

export const installAndGetOutdatedPackages = async (path: string) => {
  await npm.install(path);
  return workspace.getOutdatedPackages(path);
};
