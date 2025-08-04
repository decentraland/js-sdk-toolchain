import { t } from '/@/modules/store/translation/utils';
import './styles.css';
import { useDispatch } from '#store';
import { useCallback } from 'react';
import { actions } from '/@/modules/store/editor';
import { Typography } from 'decentraland-ui2';

/* TODO: if we wanted to fetch this playlist from YouTube, we could use the their API:

https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId={PLAYLIST_ID}&key={API_KEY}

It would require creating a project in the Google Developer Console and enabling the YouTube Data API v3.
*/

const PLAYLIST_ID = 'PLAcRraQmr_GP_K8WN7csnKnImK4R2TgMA';

const playlist = [
  {
    title: 'Making a Scene with the Creator Hub',
    id: '52LiG-4VI9c',
  },
  {
    title: 'Item Positioning',
    id: 'cNl02PFPdcQ',
  },
  {
    title: 'Using Custom 3D Art',
    id: 'UepXpH-k0EI',
  },
  {
    title: 'Smart Items - Basics',
    id: 'z7HF4GR01hE',
  },
  {
    title: 'Actions And Triggers',
    id: 'm_xWCSDDxpQ',
  },
  {
    title: 'Making Any Item Smart',
    id: 'wnnEU8GCLjc',
  },
  {
    title: 'Smart Item States and Conditions',
    id: 'wm8ZD2kSyKA',
  },
  {
    title: 'Customizing Smart Items with Code',
    id: '55H37rygD7M',
  },
];

export function Tutorial(props: { title: string; id: string; list?: string }) {
  const dispatch = useDispatch();
  const handleClick = useCallback(
    () => dispatch(actions.openTutorial(props)),
    [dispatch, props.id, props.list],
  );
  return (
    <div
      className="Tutorial"
      onClick={handleClick}
    >
      <div className="thumbnail-wrapper">
        <img
          className="thumbnail"
          src={`https://img.youtube.com/vi/${props.id}/0.jpg`}
        />
      </div>
      <div className="title">{props.title}</div>
    </div>
  );
}

export function Tutorials() {
  return (
    <div className="Tutorials">
      <Typography
        variant="h6"
        className="title"
      >
        <i className="icon"></i>
        {t('tutorials.title')}
      </Typography>
      <div className="list">
        {playlist.map(video => (
          <Tutorial
            key={video.id}
            title={video.title}
            id={video.id}
            list={PLAYLIST_ID}
          />
        ))}
      </div>
    </div>
  );
}

export function TutorialsWrapper(props: React.PropsWithChildren) {
  return (
    <div className="TutorialsWrapper">
      <div className="content">{props.children}</div>
      <Tutorials />
    </div>
  );
}
