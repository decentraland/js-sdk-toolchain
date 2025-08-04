import { useCallback } from 'react';
import { Alert, Button, IconButton } from 'decentraland-ui2';
import NotificationImportantIcon from '@mui/icons-material/NotificationImportant';
import CloseIcon from '@mui/icons-material/Close';

import { t } from '/@/modules/store/translation/utils';
import { useEditor } from '/@/hooks/useEditor';
import { useWorkspace } from '/@/hooks/useWorkspace';

export function NewDependencyVersion({ onClose }: { onClose: () => void }) {
  const { project } = useEditor();
  const { updatePackages } = useWorkspace();

  const handleClickUpdate = useCallback(() => {
    if (project) {
      updatePackages(project);
    }
    onClose();
  }, [project]);

  const renderActions = useCallback(
    () => (
      <>
        <Button
          variant="text"
          onClick={handleClickUpdate}
        >
          {t('snackbar.new_dependency_version.actions.update')}
        </Button>
        <IconButton onClick={onClose}>
          <CloseIcon color="secondary" />
        </IconButton>
      </>
    ),
    [project],
  );

  return (
    <Alert
      icon={<NotificationImportantIcon color="secondary" />}
      severity="info"
      action={renderActions()}
      sx={{ alignItems: 'center' }}
    >
      {t('snackbar.new_dependency_version.title')}
    </Alert>
  );
}
