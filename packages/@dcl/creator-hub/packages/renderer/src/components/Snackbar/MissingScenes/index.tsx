import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'decentraland-ui2';

import { t } from '/@/modules/store/translation/utils';
import { useWorkspace } from '/@/hooks/useWorkspace';

import { Button } from '../../Button';
import { MissingProjects } from '../../Modals/MissingProjects';

export function MissingScenes({ onClose }: { onClose: () => void }) {
  const [open, setOpen] = useState(false);
  const { unlistProjects, missing } = useWorkspace();

  useEffect(() => {
    if (missing.length === 0) onClose();
  }, [missing]);

  const handleModal = useCallback(
    (value: boolean) => () => {
      setOpen(value);
    },
    [],
  );

  const handleDiscardAll = useCallback(() => {
    unlistProjects(missing);
  }, []);

  const renderActions = () => (
    <>
      <Button
        color="inherit"
        size="small"
        onClick={handleModal(true)}
      >
        {t('snackbar.missing_projects.actions.view')}
      </Button>
      <Button
        color="inherit"
        size="small"
        onClick={handleDiscardAll}
      >
        {t('snackbar.missing_projects.actions.discard_all')}
      </Button>
    </>
  );

  return (
    <>
      <Alert
        severity="error"
        action={renderActions()}
      >
        {t('snackbar.missing_projects.title', { scenes: missing.length })}
      </Alert>
      <MissingProjects
        open={open}
        onClose={handleModal(false)}
      />
    </>
  );
}
