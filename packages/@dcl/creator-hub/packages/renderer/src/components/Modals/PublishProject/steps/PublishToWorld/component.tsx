import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Checkbox,
  CircularProgress as Loader,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  type SelectChangeEvent,
  FormControlLabel,
} from 'decentraland-ui2';
import WarningIcon from '@mui/icons-material/Warning';
import AddIcon from '@mui/icons-material/Add';
import type { WorldConfiguration } from '@dcl/schemas';

import { misc } from '#preload';
import type { Project } from '/shared/types/projects';
import { DEPLOY_URLS } from '/@/lib/deploy';
import { useSelector } from '#store';

import { t } from '/@/modules/store/translation/utils';
import { addBase64ImagePrefix } from '/@/modules/image';
import { ENSProvider } from '/@/modules/store/ens/types';
import { getEnsProvider } from '/@/modules/store/ens/utils';
import { useEditor } from '/@/hooks/useEditor';
import { useWorkspace } from '/@/hooks/useWorkspace';

import EmptyWorldSVG from '/assets/images/empty-deploy-to-world.svg';
import LogoDCLSVG from '/assets/images/logo-dcl.svg';
import LogoENSSVG from '/assets/images/logo-ens.svg';

import { PublishModal } from '../../PublishModal';
import { Button } from '../../../../Button';
import { type Props } from '../../types';

import './styles.css';

export function PublishToWorld(props: Props) {
  const { project, publishScene } = useEditor();
  const names = useSelector(state => state.ens.data);
  const emptyNames = Object.keys(names).length === 0;

  const handleNext = useCallback(() => {
    publishScene({ targetContent: import.meta.env.VITE_WORLDS_SERVER || DEPLOY_URLS.WORLDS });
    props.onStep('deploy');
  }, [props.onStep, publishScene]);

  return (
    <PublishModal
      title={t('modal.publish_project.worlds.select_world.title')}
      subtitle={t('modal.publish_project.worlds.select_world.description')}
      {...props}
    >
      {!emptyNames ? (
        <SelectWorld
          project={project!}
          onPublish={handleNext}
        />
      ) : (
        <EmptyNames />
      )}
    </PublishModal>
  );
}

function SelectWorld({ project, onPublish }: { project: Project; onPublish: () => void }) {
  const { updateSceneJson, updateProject } = useWorkspace();
  const names = useSelector(state => state.ens.data);
  const [name, setName] = useState(project.worldConfiguration?.name || '');
  const [ensProvider, setENSProvider] = useState(
    project.worldConfiguration?.name
      ? getEnsProvider(project.worldConfiguration?.name)
      : ENSProvider.DCL,
  );
  const [confirmWorldReplaceContent, setConfirmWorldReplaceContent] = useState<boolean>(false);

  const hasWorldContent = useMemo(() => !!names[name]?.worldStatus, [names, name]);

  const listNames = useMemo(() => {
    const _names = [];
    for (const ens in names) {
      if (names[ens].provider === ensProvider) {
        _names.push(names[ens].subdomain);
      }
    }
    return _names;
  }, [names, ensProvider]);

  const handleClick = useCallback(() => {
    onPublish();
  }, [project, name]);

  const handleClaimNewName = useCallback(
    (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      event.preventDefault();
      if (ensProvider === ENSProvider.DCL) {
        misc.openExternal('https://decentraland.org/marketplace/names/claim');
      } else {
        misc.openExternal('https://ens.domains');
      }
    },
    [ensProvider],
  );

  const handleChangeSelectProvider = useCallback((e: SelectChangeEvent) => {
    setENSProvider(e.target.value as ENSProvider);
    setName('');
    setConfirmWorldReplaceContent(false);
  }, []);

  const handleChangeSelectName = useCallback((e: SelectChangeEvent) => {
    if (!e.target.value) return;
    setName(e.target.value);
    setConfirmWorldReplaceContent(false);
  }, []);

  const handleConfirmWorldReplaceContent = useCallback(
    (_event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      setConfirmWorldReplaceContent(checked);
    },
    [],
  );

  useEffect(() => {
    if (name && project.worldConfiguration?.name !== name) {
      const worldConfiguration: WorldConfiguration = {
        ...project.worldConfiguration,
        name: name,
      };
      updateSceneJson(project.path, { worldConfiguration });
      updateProject({ ...project, worldConfiguration });
    }
  }, [project, name, updateSceneJson, updateProject]);

  // TODO: handle failed state...
  const projectIsReady = project.status === 'succeeded';

  return (
    <div className="SelectWorld">
      <div className="box">
        <div className="thumbnail">
          {!projectIsReady ? <Loader /> : <img src={addBase64ImagePrefix(project.thumbnail)} />}
        </div>
        <div className="selection">
          <Select
            variant="standard"
            color="secondary"
            value={ensProvider}
            onChange={handleChangeSelectProvider}
          >
            <MenuItem value={ENSProvider.DCL}>
              <img
                className="SelectWorld-ENSProvider-Img"
                src={LogoDCLSVG}
              />
              {t(`modal.publish_project.worlds.select_world.ens_providers.${ENSProvider.DCL}`)}
            </MenuItem>
            <MenuItem value={ENSProvider.ENS}>
              <img
                className="SelectWorld-ENSProvider-Img"
                src={LogoENSSVG}
              />
              {t(`modal.publish_project.worlds.select_world.ens_providers.${ENSProvider.ENS}`)}
            </MenuItem>
          </Select>
          <FormControl>
            <InputLabel id="world-name-label">
              {t('modal.publish_project.worlds.select_world.world_name')}
            </InputLabel>
            <Select
              variant="standard"
              color="secondary"
              labelId="world-name-label"
              label={t('modal.publish_project.worlds.select_world.world_name')}
              displayEmpty
              value={name}
              onChange={handleChangeSelectName}
              disabled={listNames.length === 0}
              renderValue={selected => {
                if (selected === '') {
                  return <em>{t('modal.publish_project.worlds.select_world.placeholder')}</em>;
                }

                return selected;
              }}
            >
              <MenuItem
                disabled
                value=""
              >
                <em>{t('modal.publish_project.worlds.select_world.placeholder')}</em>
              </MenuItem>
              {listNames.map((_world: string) => (
                <MenuItem
                  key={_world}
                  value={_world}
                >
                  {_world}
                </MenuItem>
              ))}
              <MenuItem onClick={handleClaimNewName}>
                <AddIcon />
                {ensProvider === ENSProvider.DCL
                  ? t('modal.publish_project.worlds.select_world.claim_new_name')
                  : t('modal.publish_project.worlds.select_world.claim_new_ens_domain')}
              </MenuItem>
            </Select>
          </FormControl>
          {hasWorldContent && (
            <div className="WorldHasContent">
              <div className="WarningIcon">
                <WarningIcon />
              </div>
              <Typography variant="caption">
                {t('modal.publish_project.worlds.select_world.world_has_content', { world: name })}
              </Typography>
            </div>
          )}
        </div>
      </div>
      <div className="actions">
        {hasWorldContent && (
          <div className="ConfirmWorldReplaceContent">
            <FormControlLabel
              control={
                <Checkbox
                  checked={confirmWorldReplaceContent}
                  onChange={handleConfirmWorldReplaceContent}
                />
              }
              label={t('modal.publish_project.worlds.select_world.confirm_world_replace_content')}
            />
          </div>
        )}
        <Button
          onClick={handleClick}
          disabled={!projectIsReady || !name || (hasWorldContent && !confirmWorldReplaceContent)}
        >
          {t('modal.publish_project.worlds.select_world.action')}
        </Button>
      </div>
    </div>
  );
}

function EmptyNames() {
  const handleClick = useCallback(() => {
    misc.openExternal('https://decentraland.org/marketplace/names/claim');
  }, []);

  const handleClickLearnMore = useCallback(() => {
    misc.openExternal(
      'https://docs.decentraland.org/creator/worlds/about/#worlds-from-decentraland-names',
    );
  }, []);

  return (
    <div className="EmptyNames">
      <Typography
        variant="h6"
        textAlign="center"
      >
        {t('modal.publish_project.worlds.empty_names.title')}
      </Typography>
      <img
        className="thumbnail"
        src={EmptyWorldSVG}
      />
      <Typography
        variant="body2"
        textAlign="center"
      >
        {t('modal.publish_project.worlds.empty_names.description', {
          b: (child: string) => <b>{child}</b>,
          br: () => <br />,
        })}
      </Typography>
      <div className="actions">
        <Button
          size="small"
          onClick={handleClick}
        >
          {t('modal.publish_project.worlds.empty_names.action')}
        </Button>
        <Button
          size="small"
          color="secondary"
          onClick={handleClickLearnMore}
        >
          {t('option_box.learn_more')}
        </Button>
      </div>
    </div>
  );
}
