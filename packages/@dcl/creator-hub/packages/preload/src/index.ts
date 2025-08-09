import { getServices } from './services';

import { initializeWorkspace } from './modules/workspace';

const services = getServices();

export const workspace = initializeWorkspace(services);

export * as editor from './modules/editor';
export * as misc from './modules/misc';
export * as fs from './services/fs';
export * as analytics from './modules/analytics';
export * as npm from './services/npm';
export * as settings from './modules/settings';
export * as scene from './modules/scene';
export * as custom from './modules/custom';
