import cx from 'classnames';
import type { Props } from './types';

import './styles.css';

export function Column({ children, className }: Props) {
  return <div className={cx('Column', className)}>{children}</div>;
}
