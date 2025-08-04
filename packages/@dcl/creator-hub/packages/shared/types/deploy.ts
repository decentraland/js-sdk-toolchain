import type { Locale } from './translation';

export type DeployOptions = {
  path: string;
  target?: string;
  targetContent?: string;
  language?: Locale;
};
