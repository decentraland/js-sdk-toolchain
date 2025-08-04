import classNames from 'classnames';
import { Badge } from 'decentraland-ui2';

import { useVideo } from '/@/hooks/useVideo';
import type { Props } from './types';

import './styles.css';

export function SceneCard({
  title,
  subtitle,
  description,
  videoSrc,
  imgSrc,
  disabled,
  tag,
  onClick,
}: Props) {
  const { video, hovered, onMouseEnter, onMouseLeave } = useVideo();

  return (
    <button
      type="button"
      className="SceneCard container"
      disabled={disabled}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      aria-label={title}
    >
      <div className="media">
        {videoSrc && (
          <video
            className={classNames('thumbnail', {
              hidden: !hovered,
            })}
            src={videoSrc}
            muted
            ref={video}
          />
        )}
        <img
          className={classNames('thumbnail', {
            hidden: !!hovered && videoSrc,
          })}
          alt={title}
          src={imgSrc}
        />
      </div>
      <div className="cardInfo">
        <div className="description">
          <div className="descriptionInfo">
            <span className="title">{title}</span>
            {subtitle && <span className="subtitle">{subtitle}</span>}
          </div>
          {tag ? <Badge className="badge">{tag.label}</Badge> : null}
        </div>
        {hovered && <span className="info">{description}</span>}
      </div>
    </button>
  );
}
