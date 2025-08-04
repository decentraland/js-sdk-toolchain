import { useCallback, useMemo, useState } from 'react';
import { Alert, Button, IconButton, CircularProgress as Loader } from 'decentraland-ui2';
import CloseIcon from '@mui/icons-material/Close';

import { t } from '/@/modules/store/translation/utils';
import { useDeploy } from '/@/hooks/useDeploy';
import { useWorkspace } from '/@/hooks/useWorkspace';

import { PublishProject } from '/@/components/Modals/PublishProject';

export function Deploy({ path, onClose }: { path: string; onClose: () => void }) {
  const { getDeployment } = useDeploy();
  const deployment = getDeployment(path);

  const sceneTitle = useMemo(() => {
    if (!deployment) return '';
    return deployment.info.title;
  }, [deployment]);

  const props = { path, title: sceneTitle, onClose };

  if (deployment?.status === 'pending') return <Pending {...props} />;
  if (deployment?.status === 'complete') return <Success {...props} />;
  if (deployment?.status === 'failed') return <Error {...props} />;

  return null;
}

function Pending({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const { projects } = useWorkspace();
  const project = projects.find(p => p.path === path);
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  const renderActions = useCallback(
    () => (
      <>
        <Button
          variant="text"
          onClick={openModal}
        >
          {t('snackbar.deploy.pending.actions.view')}
        </Button>
        <IconButton onClick={onClose}>
          <CloseIcon color="secondary" />
        </IconButton>
      </>
    ),
    [onClose],
  );

  if (!project) return null;

  return (
    <>
      {!open && (
        <Alert
          icon={<Loader size={20} />}
          action={renderActions()}
        >
          {t('snackbar.deploy.pending.title', { title })}
        </Alert>
      )}
      <PublishProject
        open={open}
        disableGoBack
        project={project}
        initialStep="deploy"
        onClose={closeModal}
      />
    </>
  );
}

function Success({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const { projects } = useWorkspace();
  const project = projects.find(p => p.path === path);
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  const renderActions = useCallback(
    () => (
      <>
        <Button
          variant="text"
          onClick={openModal}
        >
          {t('snackbar.deploy.success.actions.view')}
        </Button>
        <IconButton onClick={onClose}>
          <CloseIcon color="secondary" />
        </IconButton>
      </>
    ),
    [onClose],
  );

  if (!project) return null;

  return (
    <>
      {!open && (
        <Alert
          severity="success"
          action={renderActions()}
        >
          {t('snackbar.deploy.success.title', { title })}
        </Alert>
      )}
      <PublishProject
        open={open}
        disableGoBack
        project={project}
        initialStep="deploy"
        onClose={onClose}
      />
    </>
  );
}

function Error({ path, title, onClose }: { path: string; title: string; onClose: () => void }) {
  const { projects } = useWorkspace();
  const project = projects.find(p => p.path === path);
  const [open, setOpen] = useState(false);

  const openModal = useCallback(() => {
    setOpen(true);
  }, []);

  const renderActions = useCallback(
    () => (
      <>
        <Button
          variant="text"
          onClick={openModal}
        >
          {t('snackbar.deploy.error.actions.retry')}
        </Button>
        <IconButton onClick={onClose}>
          <CloseIcon color="secondary" />
        </IconButton>
      </>
    ),
    [onClose],
  );

  if (!project) return null;

  return (
    <>
      {!open && (
        <Alert
          severity="error"
          action={renderActions()}
        >
          {t('snackbar.deploy.error.title', { title })}
        </Alert>
      )}
      <PublishProject
        open={open}
        disableGoBack
        project={project}
        onClose={onClose}
      />
    </>
  );
}
