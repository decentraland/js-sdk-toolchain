import React from 'react';
import { Typography } from 'decentraland-ui2';

export type FooterProps = {
  version: string;
};

export const Footer: React.FC<FooterProps> = React.memo(({ version }) => (
  <footer className="Footer">
    <Typography variant="body2">Decentraland Creator Hub {version}</Typography>
  </footer>
));
