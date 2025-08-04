import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import cx from 'classnames';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary';
import { CircularProgress as Loader } from 'decentraland-ui2';
import {
  Container,
  Card,
  CardContent,
  Typography,
  CardActions,
  Button,
  Grid,
} from 'decentraland-ui2';
import { useEditor } from '/@/hooks/useEditor';
import { type Project } from '/shared/types/projects';
import EditorPng from '/assets/images/editor.png';
import BookPng from '/assets/images/book.png';
import InfluencePng from '/assets/images/influence.png';
import { useAuth } from '/@/hooks/useAuth';
import { useWorkspace } from '/@/hooks/useWorkspace';
import { t } from '/@/modules/store/translation/utils';
import { FEEDBACK_URL } from '/@/modules/utils';
import './styles.css';
import { actions } from '/@/modules/store/settings';
import type { AppState } from '../../modules/store';
import { UpdateAvailableModal } from '../Modals/UpdateAvailableModal';
import { Navbar, NavbarItem } from '../Navbar';
import { Footer } from '../Footer';
import { type CardBannerProps, type CardItemProps, type SignInCardProps } from './types';

import { misc } from '#preload';

const learn_resources = [
  {
    title: "Let's build the metaverse together",
    icon: <BookmarkBorderIcon />,
    href: 'https://docs.decentraland.org/creator/',
  },
  {
    title: 'Scene Editor About',
    icon: <BookmarkBorderIcon />,
    href: 'https://docs.decentraland.org/creator/web-editor/',
  },
  {
    title: 'Development Workflow',
    icon: <BookmarkBorderIcon />,
    href: 'https://docs.decentraland.org/creator/development-guide/sdk7/dev-workflow/',
  },
  {
    title: 'Product Updates',
    icon: <VideoLibraryIcon />,
    href: 'https://www.youtube.com/playlist?list=PLAcRraQmr_GMJw77zKvN84LX_OLyn-lVz',
  },
  {
    title: 'SDK Tutorials',
    icon: <VideoLibraryIcon />,
    href: 'https://www.youtube.com/playlist?list=PLAcRraQmr_GP_K8WN7csnKnImK4R2TgMA',
  },
];

const CardBanner: React.FC<CardBannerProps> = React.memo(({ image, title, onClick }) => (
  <div
    className={cx('CardBanner', { Clickable: !!onClick })}
    onClick={onClick}
  >
    <img
      className="CardBannerImage"
      src={image}
    />
    <div className="CardBannerContent">{title}</div>
  </div>
));

const CardItem: React.FC<CardItemProps> = React.memo(({ title, icon, onClick }) => (
  <Button
    className="CardItem"
    variant="text"
    color="secondary"
    size="small"
    fullWidth
    onClick={onClick}
    startIcon={icon}
  >
    <Typography variant="h6">{title}</Typography>
  </Button>
));

const SignInCard: React.FC<SignInCardProps> = React.memo(({ onClickSignIn }) => (
  <Card className="Card SignInCard">
    <CardContent className="CardContent CenteredContent">
      <Typography
        className="Title"
        variant="subtitle1"
      >
        {t('home.cards.sign_in.title')}
      </Typography>
      <Button
        className="SignInButton"
        variant="contained"
        onClick={onClickSignIn}
      >
        {t('home.cards.sign_in.action')}
      </Button>
    </CardContent>
  </Card>
));

const ScenesCard: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { projects, isLoading, runProject } = useWorkspace();
  const emptyProjects = projects.length === 0;

  const handleStartBuildingClick = useCallback(() => {
    navigate('/templates');
  }, []);

  const handleSeeAllClick = useCallback(() => {
    navigate('/scenes');
  }, []);

  const handleProjectClick = useCallback((project: Project) => {
    runProject(project);
  }, []);

  return (
    <Card className="Card ScenesCard">
      <CardBanner
        image={EditorPng}
        title={t('home.cards.scenes.title')}
        onClick={handleSeeAllClick}
      />
      <CardContent
        className={cx('CardContent', {
          CenteredContent: emptyProjects,
          EmptyProjects: emptyProjects,
        })}
      >
        {isLoading ? (
          <Loader />
        ) : emptyProjects ? (
          <>
            <Typography variant="h6">{t('home.cards.scenes.empty_scenes.description')}</Typography>
            <Button
              variant="outlined"
              color="secondary"
              size="small"
              onClick={handleStartBuildingClick}
            >
              {t('home.cards.scenes.empty_scenes.action')}
            </Button>
          </>
        ) : (
          <div className="CardList">
            {projects.slice(0, 6).map(project => (
              <CardItem
                key={project.id}
                title={project.title}
                icon={<LayersOutlinedIcon />}
                onClick={() => handleProjectClick(project)}
              />
            ))}
          </div>
        )}
      </CardContent>
      {!emptyProjects ? (
        <CardActions className="CardActions">
          <Button
            className="SeeAllButton"
            variant="text"
            color="secondary"
            fullWidth
            onClick={handleSeeAllClick}
          >
            {t('home.cards.scenes.action')}
          </Button>
        </CardActions>
      ) : null}
    </Card>
  );
});

const LearnCard: React.FC = React.memo(() => {
  const navigate = useNavigate();

  const handleClickSeeAll = useCallback(() => {
    navigate('/learn');
  }, []);

  const handleLearnItemClick = useCallback((href: string) => {
    misc.openExternal(href);
  }, []);

  return (
    <Card className="Card LearnCard">
      <CardBanner
        image={BookPng}
        title={t('home.cards.learn.title')}
        onClick={handleClickSeeAll}
      />
      <CardContent className="CardContent">
        <div className="CardList">
          {learn_resources.map((item, idx) => (
            <CardItem
              key={idx}
              title={item.title}
              icon={item.icon}
              onClick={() => handleLearnItemClick(item.href)}
            />
          ))}
        </div>
      </CardContent>
      <CardActions className="CardActions">
        <Button
          className="SeeAllButton"
          variant="text"
          color="secondary"
          fullWidth
          onClick={handleClickSeeAll}
        >
          {t('home.cards.learn.action')}
        </Button>
      </CardActions>
    </Card>
  );
});

const FeedbackCard: React.FC = React.memo(() => {
  const handleClickFeedback = useCallback(() => misc.openExternal(FEEDBACK_URL), []);

  return (
    <Card className="Card FeedbackCard">
      <CardContent className="CardContent CenteredContent">
        <img src={InfluencePng} />
        <Typography
          className="Title"
          variant="h5"
        >
          {t('home.cards.feedback.title')}
        </Typography>
        <Button
          className="FeedbackButton"
          variant="contained"
          onClick={handleClickFeedback}
        >
          {t('home.cards.feedback.action')}
        </Button>
      </CardContent>
    </Card>
  );
});

export function HomePage() {
  const auth = useAuth();
  const { version } = useEditor();
  const updateInfo = useSelector((state: AppState) => state.settings.updateInfo);
  const openNewUpdateModal = useSelector((state: AppState) => state.settings.openNewUpdateModal);
  const dispatch = useDispatch();

  return (
    <>
      <main className="HomePage">
        <Navbar active={NavbarItem.HOME} />
        <Container>
          <Typography
            variant="h3"
            mb="48px"
          >
            {t('home.header.title')}
          </Typography>
          <Grid
            container
            spacing={4}
          >
            {!auth.isSignedIn ? (
              <Grid
                item
                xs
              >
                <SignInCard onClickSignIn={auth.signIn} />
              </Grid>
            ) : null}
            <Grid
              item
              xs
            >
              <ScenesCard />
            </Grid>
            <Grid
              item
              xs
            >
              <LearnCard />
            </Grid>
            <Grid
              item
              xs
            >
              <FeedbackCard />
            </Grid>
          </Grid>
        </Container>
      </main>
      <UpdateAvailableModal
        open={openNewUpdateModal}
        onClose={() => dispatch(actions.setOpenNewUpdateModal(false))}
        version={updateInfo.version ?? ''}
      />
      {version && <Footer version={version} />}
    </>
  );
}
