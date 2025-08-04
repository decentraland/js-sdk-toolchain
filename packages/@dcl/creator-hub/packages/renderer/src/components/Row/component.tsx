import cx from 'classnames';
import type { Props } from './types';

import './styles.css';

export function Row({ children, className }: Props) {
  return <div className={cx('Row', className)}>{children}</div>;
}
