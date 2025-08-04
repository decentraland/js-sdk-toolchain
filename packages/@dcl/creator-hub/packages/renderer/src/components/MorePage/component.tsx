import cx from 'classnames';
import React from 'react';
import { Box, Button, Card, CardContent, Container, Grid, Typography } from 'decentraland-ui2';

import { misc } from '#preload';

import { t } from '/@/modules/store/translation/utils';

import EditorPng from '/assets/images/editor.png';
import CollectionsPng from '/assets/images/collections.png';
import NamesPng from '/assets/images/names.png';
import WorldPng from '/assets/images/world.png';
import LandPng from '/assets/images/land.png';

import { Navbar, NavbarItem } from '../Navbar';

import './styles.css';

const BUILDER_URL = 'https://decentraland.org/builder';

const HorizontalCardWithImage: React.FC<{
  className?: string;
  title: string;
  description: string;
  image: string;
  action: () => void;
}> = React.memo(({ className, title, description, image, action }) => (
  <Card className={cx('HorizontalCardWithImage', className)}>
    <Box className="CardImage">
      <img src={image} />
    </Box>
    <CardContent className="CardContent">
      <Box p={0}>
        <Typography
          variant="h6"
          className="title"
        >
          {title}
        </Typography>
        <Typography variant="body2">{description}</Typography>
      </Box>
      <Box className="CardActions">
        <Button onClick={action}>{t('more.cards.open_in_browser')}</Button>
      </Box>
    </CardContent>
  </Card>
));

export function MorePage() {
  return (
    <main className="MorePage">
      <Navbar active={NavbarItem.MORE} />
      <Container>
        <Typography
          variant="h3"
          mb="48px"
        >
          {t('more.header.title')}
        </Typography>
        <Typography
          className="CardsSection"
          variant="h6"
          mb="16px"
        >
          {t('more.cards.create.title')}
        </Typography>
        <Grid
          container
          spacing={3}
          mb="48px"
        >
          <Grid
            item
            xs={12}
            sm={6}
            md={6}
            lg={4}
          >
            <HorizontalCardWithImage
              className="FlipImage"
              title={t('more.cards.create.legacy_web_editor.title')}
              description={t('more.cards.create.legacy_web_editor.description')}
              action={() => misc.openExternal(`${BUILDER_URL}/scenes`)}
              image={EditorPng}
            />
          </Grid>
          <Grid
            item
            xs={12}
            sm={6}
            md={6}
            lg={4}
          >
            <HorizontalCardWithImage
              title={t('more.cards.create.collections.title')}
              description={t('more.cards.create.collections.description')}
              action={() => misc.openExternal(`${BUILDER_URL}/collections`)}
              image={CollectionsPng}
            />
          </Grid>
        </Grid>
        <Typography
          className="CardsSection"
          variant="h6"
          mb="16px"
        >
          {t('more.cards.manage.title')}
        </Typography>
        <Grid
          container
          spacing={3}
        >
          <Grid
            item
            xs={12}
            sm={6}
            md={6}
            lg={4}
          >
            <HorizontalCardWithImage
              title={t('more.cards.manage.names.title')}
              description={t('more.cards.manage.names.description')}
              action={() => misc.openExternal(`${BUILDER_URL}/names`)}
              image={NamesPng}
            />
          </Grid>
          <Grid
            item
            xs={12}
            sm={6}
            md={6}
            lg={4}
          >
            <HorizontalCardWithImage
              title={t('more.cards.manage.worlds.title')}
              description={t('more.cards.manage.worlds.description')}
              action={() => misc.openExternal(`${BUILDER_URL}/worlds?tab=dcl`)}
              image={WorldPng}
            />
          </Grid>
          <Grid
            item
            xs={12}
            sm={6}
            md={6}
            lg={4}
          >
            <HorizontalCardWithImage
              title={t('more.cards.manage.land.title')}
              description={t('more.cards.manage.land.description')}
              action={() => misc.openExternal(`${BUILDER_URL}/land`)}
              image={LandPng}
            />
          </Grid>
        </Grid>
      </Container>
    </main>
  );
}
