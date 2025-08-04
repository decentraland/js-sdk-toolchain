import cx from 'classnames';

import { Row } from '../Row';

import type { Props } from './types';

import './styles.css';

export function FiltersBar({ children, classNames }: Props) {
  const [left, right] = children;

  return (
    <Row className={cx('Filters', classNames)}>
      <Row className="left">{left}</Row>
      <Row className="right">{right}</Row>
    </Row>
  );
}
