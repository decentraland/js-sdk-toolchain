import { useCallback } from 'react';

import { t } from '/@/modules/store/translation/utils';

import { Modal } from '..';
import { Button } from '../../Button';

import type { Props } from './types';

export function DeleteProject({ open, project, onClose, onSubmit }: Props) {
  const handleSubmit = useCallback(() => {
    onSubmit(project);
  }, []);

  return (
    <Modal
      open={open}
      title={t('modal.delete_project.title', { title: project.title })}
      onClose={onClose}
      size="tiny"
      actions={
        <>
          <Button
            color="secondary"
            onClick={onClose}
          >
            {t('modal.cancel')}
          </Button>
          <Button onClick={handleSubmit}>{t('modal.confirm')}</Button>
        </>
      }
    >
      {t('modal.delete_project.remove_imported_scene', { title: project.title })}
    </Modal>
  );
}
