import { useNavigate } from 'react-router-dom';
import { Button, Typography } from 'decentraland-ui2';
import { t } from '/@/modules/store/translation/utils';
import { misc } from '#preload';

import { Container } from '../Container';
import { Navbar, NavbarItem } from '../Navbar';
import './styles.css';

function Video(props: { id: string; list: string; title: string }) {
  const url = `https://youtu.be/${props.id}?list=${props.list}`;
  return (
    <div
      className="link"
      onClick={() => misc.openExternal(url)}
    >
      <div className="thumbnail-wrapper">
        <img src={`https://img.youtube.com/vi/${props.id}/0.jpg`} />
      </div>
      <span className="title">{props.title}</span>
    </div>
  );
}

function Link(props: { url: string; title: string }) {
  return (
    <div
      className="link"
      onClick={() => misc.openExternal(props.url)}
    >
      <i className="icon" />
      <span className="title">{props.title}</span>
    </div>
  );
}

export function LearnPage() {
  const navigate = useNavigate();
  return (
    <main className="LearnPage">
      <Navbar active={NavbarItem.LEARN} />
      <Container>
        <div className="content">
          <Typography
            variant="h3"
            mb="48px"
          >
            {t('learn.header.title')}
          </Typography>
          <div className="sections">
            <div className="section videos">
              <div
                className="header clickable"
                onClick={() => navigate('/learn/videos')}
              >
                <i className="image"></i>
                <span className="title">{t('learn.header.videos')}</span>
              </div>
              <div className="content">
                <Video
                  list="PLAcRraQmr_GMJw77zKvN84LX_OLyn-lVz"
                  id="nWiyoX70vtc"
                  title="Project Updates"
                />
                <Video
                  list="PLAcRraQmr_GP_K8WN7csnKnImK4R2TgMA"
                  id="52LiG-4VI9c"
                  title="Editor (no code)"
                />
                <Video
                  list="PLAcRraQmr_GN8LcnnQk2BByo9L2Orvp9c"
                  id="-iWslh4uQIk"
                  title="Emote Tutorials"
                />
                <Video
                  list="PLAcRraQmr_GP_K8WN7csnKnImK4R2TgMA"
                  id="J_EO1LZkaiA"
                  title="Combine drag & dop + Code"
                />
              </div>
              <Button
                className="see-all"
                disableRipple
                onClick={() => navigate('/learn/videos')}
              >
                {t('learn.see_all')}
              </Button>
            </div>
            <div className="section docs">
              <div
                className="header clickable"
                onClick={() => navigate('/learn/docs')}
              >
                <i className="image"></i>
                <span className="title">{t('learn.header.docs')}</span>
              </div>
              <div className="content">
                <Link
                  url="https://docs.decentraland.org/creator/"
                  title="Let's build the metaverse together"
                />
                <Link
                  url="https://docs.decentraland.org/creator/development-guide/sdk7/sdk-101/"
                  title="About SDK"
                />
                <Link
                  url="https://docs.decentraland.org/creator/development-guide/sdk7/dev-workflow/"
                  title="Development Workflow"
                />
                <Link
                  url="https://docs.decentraland.org/creator/wearables/wearables-overview/"
                  title="Wearable Overview"
                />
                <Link
                  url="https://docs.decentraland.org/creator/emotes/emotes-overview/"
                  title="Emotes Overview"
                />
                <Link
                  url="https://docs.decentraland.org/creator/wearables-and-emotes/manage-collections/creating-collection/"
                  title="Creating a Collection"
                />
              </div>
              <Button
                className="see-all"
                onClick={() => navigate('/learn/docs')}
                disableRipple
              >
                {t('learn.see_all')}
              </Button>
            </div>
            <div className="section more">
              <div className="header">
                <i className="image"></i>
                <span className="title">{t('learn.header.more')}</span>
              </div>
              <div className="content">
                <Link
                  url="https://studios.decentraland.org/"
                  title="Decentraland Studios"
                />
                <Link
                  url="https://studios.decentraland.org/resources?sdk_version=SDK7&resource_type=Scene"
                  title="Example Scenes"
                />
                <Link
                  url="https://docs.decentraland.org/contributor/"
                  title="Open Protocol Docs"
                />
              </div>
            </div>
          </div>
        </div>
      </Container>
    </main>
  );
}
