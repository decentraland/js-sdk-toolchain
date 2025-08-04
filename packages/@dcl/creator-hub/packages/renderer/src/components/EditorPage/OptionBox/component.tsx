import { useCallback } from 'react';

import { misc } from '#preload';

import { t } from '/@/modules/store/translation/utils';
import { Button } from '../../Button';

import { type Props } from './types';

import './styles.css';

export function OptionBox({
  thumbnailSrc,
  title,
  description,
  buttonText,
  onClickPublish,
  learnMoreUrl,
}: Props) {
  const handleClickLearnMore = useCallback(() => {
    if (learnMoreUrl) misc.openExternal(learnMoreUrl);
  }, []);

  return (
    <div className="OptionBox">
      <img
        className="thumbnail"
        src={thumbnailSrc}
      />
      <h3>{title}</h3>
      <span className="description">{description}</span>
      <Button onClick={onClickPublish}>{buttonText}</Button>
      {learnMoreUrl && (
        <span
          className="learn-more"
          onClick={handleClickLearnMore}
        >
          {t('option_box.learn_more')}
        </span>
      )}
    </div>
  );
}
