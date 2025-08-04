import { CircularProgress, type CircularProgressProps } from 'decentraland-ui2';

import './styles.css';

export function Loader(props: CircularProgressProps) {
  return (
    <div className="Loader">
      <CircularProgress {...props} />
    </div>
  );
}
