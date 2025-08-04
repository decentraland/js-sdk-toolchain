import { Typography } from 'decentraland-ui2';

import type { Props } from './types';

import './styles.css';

export function Title({ value, onBack }: Props) {
  return (
    <Typography
      variant="h3"
      className="Title"
    >
      <div
        className="header"
        onClick={onBack}
      >
        <i className="back" /> <span className="title">{value}</span>
      </div>
    </Typography>
  );
}
