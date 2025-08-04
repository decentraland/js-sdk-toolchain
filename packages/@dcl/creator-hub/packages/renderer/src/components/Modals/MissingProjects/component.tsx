import { useCallback } from 'react';

import { useWorkspace } from '/@/hooks/useWorkspace';
import { t } from '/@/modules/store/translation/utils';
import { ellipsisAtMiddle } from '/@/modules/project';

import { Modal } from '..';
import { Button } from '../../Button';

import type { Props } from './types';
import { Row } from '../../Row';

import './styles.css';

export function MissingProjects({ open, onClose }: Props) {
  const { reimportProject, unlistProjects, missing } = useWorkspace();

  const handleFind = useCallback(
    (path: string) => () => {
      reimportProject(path);
    },
    [],
  );

  const handleDiscard = useCallback(
    (path: string) => () => {
      unlistProjects([path]);
    },
    [],
  );

  const handleDiscardAll = useCallback(() => {
    unlistProjects(missing);
    onClose();
  }, []);

  return (
    <Modal
      open={open}
      title={`${t('modal.missing_projects.title')} (${missing.length})`}
      onClose={onClose}
      size="tiny"
    >
      <div className="MissingProjects">
        {missing.map(path => (
          <Row key={path}>
            {ellipsisAtMiddle(path, 40)}
            <div className="actions">
              <Button
                color="primary"
                onClick={handleFind(path)}
              >
                {t('modal.missing_projects.find')}
              </Button>
              <Button
                color="info"
                onClick={handleDiscard(path)}
              >
                {t('modal.missing_projects.discard')}
              </Button>
            </div>
          </Row>
        ))}
        <Button
          className="discard-all"
          color="info"
          onClick={handleDiscardAll}
          disabled={missing.length === 0}
        >
          {t('modal.missing_projects.discard_all')}
        </Button>
      </div>
    </Modal>
  );
}
