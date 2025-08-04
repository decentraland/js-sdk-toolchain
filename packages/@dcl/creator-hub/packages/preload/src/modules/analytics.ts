import type { Events } from '/shared/types/analytics';
import { invoke } from '../services/ipc';

export async function track<T extends keyof Events>(event: T, data: Events[T]) {
  await invoke('analytics.track', event, data);
}

export async function identify(userId: string, traits?: Record<string, any>) {
  await invoke('analytics.identify', userId, traits);
}

export async function getAnonymousId() {
  return invoke('analytics.getAnonymousId');
}

export async function getProjectId(path: string) {
  return invoke('analytics.getProjectId', path);
}
