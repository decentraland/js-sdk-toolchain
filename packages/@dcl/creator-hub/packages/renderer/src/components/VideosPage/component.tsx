import { useNavigate } from 'react-router-dom';
import { t } from '/@/modules/store/translation/utils';
import { misc } from '#preload';

import { Container } from '../Container';
import { Navbar, NavbarItem } from '../Navbar';
import './styles.css';
import { Title } from '../Title';
import { Typography } from 'decentraland-ui2';

function Playlist(props: { list: string; videos: { id: string; title: string }[]; title: string }) {
  return (
    <div className="playlist">
      <div className="header">
        <i className="icon"></i>
        <Typography
          variant="h6"
          className="title"
        >
          {props.title}
        </Typography>
      </div>
      <div className="content">
        {props.videos.map((video, index) => (
          <Video
            key={index}
            list={props.list}
            id={video.id}
            title={video.title}
          />
        ))}
      </div>
    </div>
  );
}

function Video(props: { id: string; list: string; title: string }) {
  const url = `https://youtu.be/${props.id}?list=${props.list}`;
  return (
    <div
      className="video"
      onClick={() => misc.openExternal(url)}
      title={props.title}
    >
      <img
        className="thumbnail"
        src={`https://img.youtube.com/vi/${props.id}/0.jpg`}
      />
      <span className="title">{props.title}</span>
    </div>
  );
}

export function VideosPage() {
  const navigate = useNavigate();

  return (
    <main className="VideosPage">
      <Navbar active={NavbarItem.LEARN} />
      <Container>
        <Title
          value={t('learn.videos.title')}
          onBack={() => navigate('/learn')}
        />
        <div className="playlists">
          <Playlist
            title="Product Updates"
            list="PLAcRraQmr_GMJw77zKvN84LX_OLyn-lVz"
            videos={[
              { id: 'nWiyoX70vtc', title: 'New Decentralans Builder Templates' },
              { id: 'biJ6UDo7D6Q', title: 'Update: Saved Outfits' },
              { id: 'qdS2KuXH0-k', title: 'Decentraland Profile Updates' },
              { id: 'l0D1LTo-0_o', title: 'Introducing DCL Camera' },
              { id: '08Q0qcWmAwM', title: 'Decentraland Emotes 2.0' },
            ]}
          />
          <Playlist
            title="Editor (No Code) Tutorials"
            list="PLAcRraQmr_GOJiVO5ZtZ86hef4unLsEkf"
            videos={[
              { id: '52LiG-4VI9c', title: 'Making a Scene with the Creator Hub' },
              { id: 'cNl02PFPdcQ', title: 'Item Positioning' },
              { id: 'UepXpH-k0EI', title: 'Using Custom 3D Art' },
              { id: 'z7HF4GR01hE', title: 'Smart Items - Basics' },
              { id: 'm_xWCSDDxpQ', title: 'Actions And Triggers' },
              { id: 'wnnEU8GCLjc', title: 'Making Any Item Smart' },
              { id: 'wm8ZD2kSyKA', title: 'Smart Item States and Conditions' },
            ]}
          />
          <Playlist
            title="SDK7 Tutorials"
            list="PLAcRraQmr_GPrMmQekqbMWhyBxo3lXs8p"
            videos={[{ id: '55H37rygD7M', title: 'Customizing Smart Items with Code' }]}
          />
          <Playlist
            title="Emote Tutorials"
            list="PLAcRraQmr_GN8LcnnQk2BByo9L2Orvp9c"
            videos={[
              { id: '-iWslh4uQIk', title: 'Decentraland Tutorial - Animation tips for emotes' },
              { id: 'B3Oqgg25kBY', title: 'Decentraland Tutorial - Creating an emote' },
              { id: 'EJ_z0Hs-QC8', title: 'Decentraland Tutorial - Rig Overview' },
              { id: '5PEF2pwZxtY', title: 'Emote Workshop by Isa' },
            ]}
          />
        </div>
      </Container>
    </main>
  );
}
