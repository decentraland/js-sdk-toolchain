import type { ReactNode } from 'react';

export type Step = {
  bulletText: ReactNode;
  name: string;
  description?: string;
  state?: 'idle' | 'pending' | 'complete' | 'failed';
};
