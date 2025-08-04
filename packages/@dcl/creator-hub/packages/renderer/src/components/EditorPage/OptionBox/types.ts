import { type MouseEvent } from 'react';

export type Props = {
  thumbnailSrc: string;
  title: string;
  description: string;
  buttonText: string;
  onClickPublish: (e: MouseEvent) => void;
  learnMoreUrl?: string;
};
