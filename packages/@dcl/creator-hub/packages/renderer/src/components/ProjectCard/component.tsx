import { CircularProgress as Loader, Typography, Badge } from 'decentraland-ui2';
import { type MouseEvent, useCallback } from 'react';

import { t } from '/@/modules/store/translation/utils';
import { isTimeAgo, minutes } from '/shared/time';

import { Dropdown } from '../Dropdown';

import type { Props } from './types';

import './styles.css';

export function ProjectCard({
  title,
  description,
  imageUrl,
  videoUrl,
  content,
  dropdownOptions,
  width = 256,
  height = 240,
  publishedAt = 0,
  onClick,
  status,
}: Props) {
  const handleMouseEnterVideo = useCallback(
    ({ currentTarget: video }: React.MouseEvent<HTMLVideoElement>) => {
      video.muted = true;
      video.play();
    },
    [],
  );

  const handleMouseLeaveVideo = useCallback(
    ({ currentTarget: video }: React.MouseEvent<HTMLVideoElement>) => {
      video.pause();
      video.currentTime = 0;
    },
    [],
  );

  const widthPx = `${width}px`;
  const heightPx = `${height}px`;

  return (
    <div
      className="ProjectCard"
      onClick={onClick}
      style={{ width: widthPx, height: heightPx }}
    >
      <Overlay
        status={status}
        width={widthPx}
        height={heightPx}
      />
      {videoUrl ? (
        <video
          className="video"
          src={videoUrl}
          onMouseEnter={handleMouseEnterVideo}
          onMouseLeave={handleMouseLeaveVideo}
        />
      ) : (
        <div
          className="thumbnail"
          style={imageUrl ? { backgroundImage: `url(${imageUrl})` } : {}}
        />
      )}
      {isTimeAgo(publishedAt, minutes(10)) && (
        <Badge className="badge">{t('scene_list.badges.published')}</Badge>
      )}
      <div className="info">
        <div className="title">
          <Typography variant="h6">{title}</Typography>
          {dropdownOptions?.length && (
            <Dropdown
              className="options-dropdown"
              options={dropdownOptions}
            />
          )}
        </div>
        {description && <p className="description">{description}</p>}
        {content && <div className="content">{content}</div>}
      </div>
    </div>
  );
}

function Overlay({
  status,
  width,
  height,
}: {
  status: Props['status'];
  width: string;
  height: string;
}) {
  if (status !== 'loading') return null;

  const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div
      className="Overlay"
      style={{ width, height }}
      onClick={handleClick}
    >
      <Loader />
      {t('scene_list.saving')}
    </div>
  );
}
