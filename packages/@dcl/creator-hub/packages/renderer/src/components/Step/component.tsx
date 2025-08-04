import { useMemo } from 'react';
import cx from 'classnames';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

import type { Step } from './types';

import './styles.css';

export function Step({ bulletText, name, description, state = 'idle' }: Step) {
  const bullet = useMemo(() => {
    if (state === 'complete') return <CheckIcon />;
    if (state === 'failed') return <CloseIcon />;
    return bulletText;
  }, [state, bulletText]);

  return (
    <div className={cx('Step', state)}>
      <div className="bullet">{bullet}</div>
      <div className="body">
        <h4>{name}</h4>
        <span>{description}</span>
      </div>
    </div>
  );
}

export function ConnectedSteps({ steps }: { steps: Step[] }) {
  return (
    <div className="ConnectedSteps">
      {steps.map(($, idx) => (
        <Step
          {...$}
          key={idx}
        />
      ))}
    </div>
  );
}
