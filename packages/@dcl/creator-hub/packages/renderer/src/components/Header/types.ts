import type { ReactNode } from 'react';

export type Props = {
  classNames?: string;
  children: [ReactNode, ReactNode];
  hideUserMenu?: boolean;
};
