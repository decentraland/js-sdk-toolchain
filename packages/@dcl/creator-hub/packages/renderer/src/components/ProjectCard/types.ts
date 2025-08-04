import { type TypographyProps } from 'decentraland-ui2';
import type { ReactNode } from 'react';

import type { Status } from '/shared/types/async';

export type Props = {
  title: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  content?: ReactNode;
  width?: number;
  height?: number;
  publishedAt?: number;
  dropdownOptions?: { text: string; handler: () => void }[];
  titleVariant?: TypographyProps['variant'];
  status?: Status;
  onClick: () => void;
};
